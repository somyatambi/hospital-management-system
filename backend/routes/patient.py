from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from backend.extensions import db, cache
from backend.models.user import User
from backend.models.doctor_profile import DoctorProfile
from backend.models.patient_profile import PatientProfile
from backend.models.appointment import Appointment
from backend.models.treatment import Treatment
from backend.models.availability import DoctorAvailability
from backend.models.department import Department
from functools import wraps
from datetime import datetime, date, timedelta

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patient')

def patient_required(fn):
    """Decorator: blocks the route unless the logged-in user has role='patient'."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()

        if claims.get('role') != 'patient':
            return jsonify({'error': 'Patient access required'}), 403

        return fn(*args, **kwargs)

    return wrapper

def get_patient_profile():
    """
    Read the JWT token to get the user ID, then return that user's PatientProfile.
    Returns None if no profile exists.
    """

    user_id = int(get_jwt_identity())

    user = User.query.get(user_id)

    if user and user.patient_profile:
        return user.patient_profile

    return None

@patient_bp.route('/dashboard', methods=['GET'])
@patient_required
def dashboard():
    """Return dashboard data for the logged-in patient."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    today = date.today()
    week_later = today + timedelta(days=7)

    all_departments = Department.query.all()
    departments_list = []
    for dept in all_departments:
        departments_list.append(dept.to_dict())

    upcoming_query = Appointment.query.filter(
        Appointment.patient_id == patient.id,
        Appointment.date >= today,
        Appointment.status == 'Booked'
    ).order_by(Appointment.date, Appointment.time).all()

    upcoming_list = []
    for appt in upcoming_query:
        upcoming_list.append(appt.to_dict())

    past_query = Appointment.query.filter(
        Appointment.patient_id == patient.id,
        Appointment.status.in_(['Completed', 'Cancelled'])
    ).order_by(Appointment.date.desc()).limit(10).all()

    past_list = []
    for appt in past_query:
        past_list.append(appt.to_dict())

    available_slots = DoctorAvailability.query.filter(
        DoctorAvailability.date >= today,
        DoctorAvailability.date <= week_later,
        DoctorAvailability.is_available == True
    ).all()

    seen_doctor_ids = {}
    available_doctors_list = []
    for slot in available_slots:
        if slot.doctor_id not in seen_doctor_ids:
            seen_doctor_ids[slot.doctor_id] = True
            doctor = DoctorProfile.query.get(slot.doctor_id)
            if doctor:
                available_doctors_list.append(doctor.to_dict())

    return jsonify({
        'patient': patient.to_dict(),
        'departments': departments_list,
        'upcoming_appointments': upcoming_list,
        'past_appointments': past_list,
        'available_doctors': available_doctors_list,
    }), 200

@patient_bp.route('/profile', methods=['GET'])
@patient_required
def get_profile():
    """Return the logged-in patient's full profile details."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    data = patient.to_dict()

    data['email'] = patient.user.email
    data['username'] = patient.user.username

    return jsonify(data), 200

@patient_bp.route('/profile', methods=['PUT'])
@patient_required
def update_profile():
    """Update the logged-in patient's profile. Only provided fields are changed."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    data = request.get_json()

    if 'name' in data:
        patient.name = data['name'].strip()
    if 'phone' in data:
        patient.phone = data['phone'].strip()
    if 'gender' in data:
        patient.gender = data['gender'].strip()
    if 'blood_group' in data:
        patient.blood_group = data['blood_group'].strip()
    if 'address' in data:
        patient.address = data['address'].strip()
    if 'emergency_contact' in data:
        patient.emergency_contact = data['emergency_contact'].strip()
    if 'medical_history' in data:
        patient.medical_history = data['medical_history'].strip()
    if 'date_of_birth' in data and data['date_of_birth']:
        try:
            patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.commit()

    updated_data = patient.to_dict()
    updated_data['email'] = patient.user.email
    updated_data['username'] = patient.user.username

    return jsonify(updated_data), 200

@patient_bp.route('/doctors', methods=['GET'])
@patient_required
def search_doctors():
    """
    Return a list of active doctors. Supports filters:
      ?search=John
      ?specialization=Cardiology
      ?department_id=2
    """

    search = request.args.get('search', '').strip()
    specialization = request.args.get('specialization', '').strip()
    department_id = request.args.get('department_id', type=int)

    query = DoctorProfile.query.join(User).filter(User.is_active == True)

    if search:
        query = query.filter(DoctorProfile.name.ilike('%' + search + '%'))
    if specialization:
        query = query.filter(DoctorProfile.specialization.ilike('%' + specialization + '%'))
    if department_id:
        query = query.filter(DoctorProfile.department_id == department_id)

    doctors = query.all()

    result = []
    for doc in doctors:
        result.append(doc.to_dict())

    return jsonify(result), 200

@patient_bp.route('/doctors/<int:doctor_id>', methods=['GET'])
@patient_required
def get_doctor_details(doctor_id):
    """
    Return a doctor's profile AND their availability broken into 30-minute slots.

    HOW THE 30-MINUTE SLOT LOGIC WORKS:
      A doctor may set one big window like 09:00 to 17:00.
      We break that window into individual 30-minute slots:
        09:00-09:30, 09:30-10:00, 10:00-10:30 … 16:30-17:00
      For each slot we check if an appointment already exists at that time.
      If yes, is_booked=True and the frontend shows it as greyed-out.
    """

    from datetime import datetime as dt

    doctor = DoctorProfile.query.get_or_404(doctor_id)

    today = date.today()
    week_later = today + timedelta(days=7)

    availabilities = DoctorAvailability.query.filter(
        DoctorAvailability.doctor_id == doctor.id,
        DoctorAvailability.date >= today,
        DoctorAvailability.date <= week_later,
        DoctorAvailability.is_available == True
    ).order_by(DoctorAvailability.date, DoctorAvailability.start_time).all()

    booked_appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.date >= today,
        Appointment.date <= week_later,
        Appointment.status == 'Booked'
    ).all()

    booked_set = set()
    for appt in booked_appointments:
        date_str = appt.date.isoformat()
        time_str = appt.time.strftime('%H:%M')
        booked_set.add((date_str, time_str))

    slots = []
    for avail in availabilities:
        current_time = dt.combine(avail.date, avail.start_time)
        window_end   = dt.combine(avail.date, avail.end_time)

        while current_time + timedelta(minutes=30) <= window_end:
            slot_start = current_time.strftime('%H:%M')
            slot_end   = (current_time + timedelta(minutes=30)).strftime('%H:%M')

            key = (avail.date.isoformat(), slot_start)
            if key in booked_set:
                is_booked = True
            else:
                is_booked = False

            slot_dict = {
                'id': str(avail.id) + '_' + slot_start.replace(':', ''),
                'availability_id': avail.id,
                'date': avail.date.isoformat(),
                'start_time': slot_start,
                'end_time': slot_end,
                'is_booked': is_booked,
            }
            slots.append(slot_dict)

            current_time = current_time + timedelta(minutes=30)

    data = doctor.to_dict()
    data['availabilities'] = slots

    return jsonify(data), 200

@patient_bp.route('/departments', methods=['GET'])
@patient_required
@cache.cached(timeout=120, key_prefix='all_departments')
def get_departments():
    """
    Return all departments. This result is CACHED in Redis for 120 seconds.

    WHY CACHE THIS?
      Departments change very rarely (maybe once a month). There is no point
      hitting the database on every page load. Redis stores the result and
      serves it instantly until the cache expires.
    """

    all_departments = Department.query.all()

    result = []
    for dept in all_departments:
        result.append(dept.to_dict())

    return jsonify(result), 200

@patient_bp.route('/appointments', methods=['GET'])
@patient_required
def get_appointments():
    """Return all of the logged-in patient's appointments. Supports ?status= filter."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    status = request.args.get('status', '').strip()

    query = Appointment.query.filter_by(patient_id=patient.id)

    if status:
        query = query.filter_by(status=status)

    appointments = query.order_by(Appointment.date.desc(), Appointment.time.desc()).all()

    result = []
    for appt in appointments:
        result.append(appt.to_dict())

    return jsonify(result), 200

@patient_bp.route('/appointments', methods=['POST'])
@patient_required
def book_appointment():
    """
    Book a new appointment with a doctor.

    Steps:
      1. Validate the incoming data (doctor_id, date, time).
      2. Check the doctor exists and is active.
      3. Check the chosen time falls inside the doctor's available window.
      4. Check no one else has already booked that exact slot.
      5. Check the patient themselves doesn't have another appointment at the same time.
      6. Save the appointment to the database.
    """

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    data = request.get_json()

    doctor_id    = data.get('doctor_id')
    appt_date_str = data.get('date')
    appt_time_str = data.get('time')
    reason        = data.get('reason', '').strip()

    if not doctor_id or not appt_date_str or not appt_time_str:
        return jsonify({'error': 'Doctor ID, date, and time are required'}), 400

    doctor = DoctorProfile.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404

    if not doctor.user.is_active:
        return jsonify({'error': 'Doctor is not available'}), 400

    try:
        appt_date = datetime.strptime(appt_date_str, '%Y-%m-%d').date()
        appt_time = datetime.strptime(appt_time_str, '%H:%M').time()
    except ValueError:
        return jsonify({'error': 'Invalid date or time format. Use YYYY-MM-DD and HH:MM'}), 400

    if appt_date < date.today():
        return jsonify({'error': 'Cannot book appointments in the past'}), 400

    availability = DoctorAvailability.query.filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.date == appt_date,
        DoctorAvailability.start_time <= appt_time,
        DoctorAvailability.end_time > appt_time,
        DoctorAvailability.is_available == True
    ).first()

    if not availability:
        return jsonify({'error': 'Doctor is not available at the requested time'}), 400

    duplicate = Appointment.query.filter_by(
        doctor_id=doctor_id,
        date=appt_date,
        time=appt_time,
        status='Booked'
    ).first()

    if duplicate:
        return jsonify({'error': 'This time slot is already booked'}), 409

    patient_clash = Appointment.query.filter_by(
        patient_id=patient.id,
        date=appt_date,
        time=appt_time,
        status='Booked'
    ).first()

    if patient_clash:
        return jsonify({'error': 'You already have an appointment at this time'}), 409

    new_appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor_id,
        date=appt_date,
        time=appt_time,
        status='Booked',
        reason=reason,
    )
    db.session.add(new_appointment)
    db.session.commit()

    return jsonify({'message': 'Appointment booked successfully', 'appointment': new_appointment.to_dict()}), 201

@patient_bp.route('/appointments/<int:appt_id>/reschedule', methods=['PUT'])
@patient_required
def reschedule_appointment(appt_id):
    """
    Reschedule an existing booked appointment to a new date and time.
    The same validation checks as booking apply to the new time slot.
    """

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    appointment = Appointment.query.get_or_404(appt_id)

    if appointment.patient_id != patient.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if appointment.status != 'Booked':
        return jsonify({'error': 'Only booked appointments can be rescheduled'}), 400

    data = request.get_json()
    new_date_str = data.get('date')
    new_time_str = data.get('time')

    if not new_date_str or not new_time_str:
        return jsonify({'error': 'New date and time are required'}), 400

    try:
        new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
        new_time = datetime.strptime(new_time_str, '%H:%M').time()
    except ValueError:
        return jsonify({'error': 'Invalid date or time format'}), 400

    if new_date < date.today():
        return jsonify({'error': 'Cannot reschedule to a past date'}), 400

    availability = DoctorAvailability.query.filter(
        DoctorAvailability.doctor_id == appointment.doctor_id,
        DoctorAvailability.date == new_date,
        DoctorAvailability.start_time <= new_time,
        DoctorAvailability.end_time > new_time,
        DoctorAvailability.is_available == True
    ).first()

    if not availability:
        return jsonify({'error': 'Doctor is not available at the requested time'}), 400

    existing = Appointment.query.filter(
        Appointment.doctor_id == appointment.doctor_id,
        Appointment.date == new_date,
        Appointment.time == new_time,
        Appointment.status == 'Booked',
        Appointment.id != appt_id
    ).first()

    if existing:
        return jsonify({'error': 'This time slot is already booked'}), 409

    appointment.date = new_date
    appointment.time = new_time
    db.session.commit()

    return jsonify({'message': 'Appointment rescheduled', 'appointment': appointment.to_dict()}), 200

@patient_bp.route('/appointments/<int:appt_id>/cancel', methods=['PUT'])
@patient_required
def cancel_appointment(appt_id):
    """Cancel a booked appointment. Status changes to 'Cancelled'."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    appointment = Appointment.query.get_or_404(appt_id)

    if appointment.patient_id != patient.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if appointment.status != 'Booked':
        return jsonify({'error': 'Only booked appointments can be cancelled'}), 400

    appointment.status = 'Cancelled'
    db.session.commit()

    return jsonify({'message': 'Appointment cancelled', 'appointment': appointment.to_dict()}), 200

@patient_bp.route('/treatments', methods=['GET'])
@patient_required
def get_treatments():
    """
    Return all completed appointments for the patient.
    Each appointment includes the treatment details the doctor added.
    """

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    appointments = Appointment.query.filter_by(
        patient_id=patient.id,
        status='Completed'
    ).order_by(Appointment.date.desc()).all()

    result = []
    for appt in appointments:
        appt_dict = appt.to_dict()
        result.append(appt_dict)

    return jsonify(result), 200

@patient_bp.route('/export-treatments', methods=['POST'])
@patient_required
def trigger_export():
    """Kick off a background Celery task to export treatment history as CSV."""

    patient = get_patient_profile()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404

    from backend.tasks import export_patient_treatments

    task = export_patient_treatments.delay(patient.id, patient.user.email)

    return jsonify({
        'message': 'Export job started. You will receive an email when it is ready.',
        'task_id': task.id
    }), 202

@patient_bp.route('/export-status/<task_id>', methods=['GET'])
@patient_required
def export_status(task_id):
    """Check the progress of a running CSV export task by its task_id."""

    from backend.tasks import celery_app

    task = celery_app.AsyncResult(task_id)

    if task.state == 'PENDING':
        return jsonify({'status': 'pending', 'message': 'Export is being processed...'}), 200
    elif task.state == 'SUCCESS':
        return jsonify({'status': 'completed', 'message': 'Export is ready!', 'result': task.result}), 200
    elif task.state == 'FAILURE':
        return jsonify({'status': 'failed', 'message': 'Export failed.'}), 500
    else:
        return jsonify({'status': task.state}), 200
