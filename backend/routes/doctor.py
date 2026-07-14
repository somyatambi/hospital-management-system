from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from backend.extensions import db, cache
from backend.models.user import User
from backend.models.doctor_profile import DoctorProfile
from backend.models.appointment import Appointment
from backend.models.treatment import Treatment
from backend.models.availability import DoctorAvailability
from functools import wraps
from datetime import datetime, date, timedelta, time

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')

def doctor_required(fn):
    """Decorator: blocks the route unless the logged-in user has role='doctor'."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()

        if claims.get('role') != 'doctor':
            return jsonify({'error': 'Doctor access required'}), 403

        return fn(*args, **kwargs)

    return wrapper

def get_doctor_profile():
    """
    Read the JWT token to get the user ID, then return that user's DoctorProfile.
    Returns None if no profile exists.
    """

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user and user.doctor_profile:
        return user.doctor_profile

    return None

@doctor_bp.route('/dashboard', methods=['GET'])
@doctor_required
def dashboard():
    """Return dashboard data for the logged-in doctor."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    today = date.today()
    week_later = today + timedelta(days=7)

    upcoming_query = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.date >= today,
        Appointment.date <= week_later,
        Appointment.status == 'Booked'
    ).order_by(Appointment.date, Appointment.time).all()

    upcoming_list = []
    for appt in upcoming_query:
        upcoming_list.append(appt.to_dict())

    todays_query = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.date == today
    ).order_by(Appointment.time).all()

    todays_list = []
    for appt in todays_query:
        todays_list.append(appt.to_dict())

    total_appointments = Appointment.query.filter_by(doctor_id=doctor.id).count()

    completed_count = Appointment.query.filter_by(doctor_id=doctor.id, status='Completed').count()

    all_patient_ids_query = Appointment.query.filter_by(doctor_id=doctor.id).all()
    unique_patient_ids = set()
    for appt in all_patient_ids_query:
        unique_patient_ids.add(appt.patient_id)
    total_patients = len(unique_patient_ids)

    return jsonify({
        'doctor': doctor.to_dict(),
        'upcoming_appointments': upcoming_list,
        'todays_appointments': todays_list,
        'total_appointments': total_appointments,
        'completed_appointments': completed_count,
        'total_patients': total_patients,
    }), 200

@doctor_bp.route('/profile', methods=['GET'])
@doctor_required
def get_profile():
    """Return the logged-in doctor's full profile details."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    data = doctor.to_dict()

    data['email'] = doctor.user.email
    data['username'] = doctor.user.username

    return jsonify(data), 200

@doctor_bp.route('/profile', methods=['PUT'])
@doctor_required
def update_profile():
    """Update the doctor's own profile. Only the provided fields are changed."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    data = request.get_json()

    if 'phone' in data:
        doctor.phone = data['phone'].strip()
    if 'bio' in data:
        doctor.bio = data['bio'].strip()
    if 'qualification' in data:
        doctor.qualification = data['qualification'].strip()
    if 'consultation_fee' in data:
        doctor.consultation_fee = data['consultation_fee']

    db.session.commit()

    return jsonify({'message': 'Profile updated', 'doctor': doctor.to_dict()}), 200

@doctor_bp.route('/appointments', methods=['GET'])
@doctor_required
def get_appointments():
    """Return all appointments for the logged-in doctor. Supports ?status= filter."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    status = request.args.get('status', '').strip()

    query = Appointment.query.filter_by(doctor_id=doctor.id)

    if status:
        query = query.filter_by(status=status)

    appointments = query.order_by(Appointment.date.desc(), Appointment.time.desc()).all()

    result = []
    for appt in appointments:
        result.append(appt.to_dict())

    return jsonify(result), 200

@doctor_bp.route('/appointments/<int:appt_id>/complete', methods=['PUT'])
@doctor_required
def complete_appointment(appt_id):
    """
    Mark an appointment as Completed and save the treatment details.

    The doctor must provide at least a diagnosis. Prescription, notes,
    and a follow-up date are optional.

    This creates a new Treatment row linked to the appointment.
    """

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    appointment = Appointment.query.get_or_404(appt_id)

    if appointment.doctor_id != doctor.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if appointment.status != 'Booked':
        return jsonify({'error': 'Only booked appointments can be marked as completed'}), 400

    data = request.get_json()

    diagnosis     = data.get('diagnosis', '').strip()
    prescription  = data.get('prescription', '').strip()
    doctor_notes  = data.get('doctor_notes', '').strip()
    next_visit_date = data.get('next_visit_date')

    if not diagnosis:
        return jsonify({'error': 'Diagnosis is required'}), 400

    appointment.status = 'Completed'

    new_treatment = Treatment(
        appointment_id=appointment.id,
        diagnosis=diagnosis,
        prescription=prescription,
        doctor_notes=doctor_notes,
    )

    if next_visit_date:
        try:
            new_treatment.next_visit_date = datetime.strptime(next_visit_date, '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.add(new_treatment)
    db.session.commit()

    return jsonify({'message': 'Appointment completed', 'appointment': appointment.to_dict()}), 200

@doctor_bp.route('/appointments/<int:appt_id>/cancel', methods=['PUT'])
@doctor_required
def cancel_appointment(appt_id):
    """Cancel an appointment. Status changes from 'Booked' to 'Cancelled'."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    appointment = Appointment.query.get_or_404(appt_id)

    if appointment.doctor_id != doctor.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if appointment.status != 'Booked':
        return jsonify({'error': 'Only booked appointments can be cancelled'}), 400

    appointment.status = 'Cancelled'
    db.session.commit()

    return jsonify({'message': 'Appointment cancelled', 'appointment': appointment.to_dict()}), 200

@doctor_bp.route('/patients/<int:patient_id>/history', methods=['GET'])
@doctor_required
def get_patient_history(patient_id):
    """Return all appointments this doctor has had with a specific patient."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    appointments = Appointment.query.filter_by(
        doctor_id=doctor.id,
        patient_id=patient_id
    ).order_by(Appointment.date.desc()).all()

    result = []
    for appt in appointments:
        result.append(appt.to_dict())

    return jsonify(result), 200

@doctor_bp.route('/patients/<int:patient_id>/treatment', methods=['PUT'])
@doctor_required
def update_treatment(patient_id):
    """
    Update an existing treatment record. The request body must include
    treatment_id so we know which Treatment row to modify.
    """

    doctor = get_doctor_profile()
    data = request.get_json()

    treatment_id = data.get('treatment_id')
    treatment = Treatment.query.get_or_404(treatment_id)

    if treatment.appointment.doctor_id != doctor.id:
        return jsonify({'error': 'Unauthorized'}), 403

    if 'diagnosis' in data:
        treatment.diagnosis = data['diagnosis'].strip()
    if 'prescription' in data:
        treatment.prescription = data['prescription'].strip()
    if 'doctor_notes' in data:
        treatment.doctor_notes = data['doctor_notes'].strip()
    if 'next_visit_date' in data and data['next_visit_date']:
        try:
            treatment.next_visit_date = datetime.strptime(data['next_visit_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.commit()

    return jsonify({'message': 'Treatment updated', 'treatment': treatment.to_dict()}), 200

@doctor_bp.route('/availability', methods=['GET'])
@doctor_required
def get_availability():
    """Return this doctor's availability windows for the next 7 days."""

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    today = date.today()
    week_later = today + timedelta(days=7)

    availabilities = DoctorAvailability.query.filter(
        DoctorAvailability.doctor_id == doctor.id,
        DoctorAvailability.date >= today,
        DoctorAvailability.date <= week_later
    ).order_by(DoctorAvailability.date, DoctorAvailability.start_time).all()

    result = []
    for av in availabilities:
        result.append(av.to_dict())

    return jsonify(result), 200

@doctor_bp.route('/availability', methods=['POST'])
@doctor_required
def set_availability():
    """
    Add or update an availability window for a specific date and time range.

    If a window with the same doctor_id + date + start_time already exists,
    we update the end_time instead of creating a duplicate.
    This is useful when the doctor edits an existing slot.
    """

    doctor = get_doctor_profile()
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404

    data = request.get_json()

    av_date_str    = data.get('date')
    start_time_str = data.get('start_time')
    end_time_str   = data.get('end_time')

    if not av_date_str or not start_time_str or not end_time_str:
        return jsonify({'error': 'Date, start_time, and end_time are required'}), 400

    try:
        av_date    = datetime.strptime(av_date_str, '%Y-%m-%d').date()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time   = datetime.strptime(end_time_str, '%H:%M').time()
    except ValueError:
        return jsonify({'error': 'Invalid date or time format'}), 400

    today = date.today()
    max_date = today + timedelta(days=7)

    if av_date < today or av_date > max_date:
        return jsonify({'error': 'Availability can only be set for the next 7 days'}), 400

    existing = DoctorAvailability.query.filter_by(
        doctor_id=doctor.id,
        date=av_date,
        start_time=start_time
    ).first()

    if existing:
        existing.end_time = end_time
        existing.is_available = True
    else:
        new_availability = DoctorAvailability(
            doctor_id=doctor.id,
            date=av_date,
            start_time=start_time,
            end_time=end_time,
            is_available=True,
        )
        db.session.add(new_availability)

    db.session.commit()

    try:
        cache.delete('doctor_availabilities')
    except Exception:
        pass

    return jsonify({'message': 'Availability set successfully'}), 201

@doctor_bp.route('/availability/<int:av_id>', methods=['DELETE'])
@doctor_required
def remove_availability(av_id):
    """Delete an availability window so no new bookings can be made for that time."""

    doctor = get_doctor_profile()
    av = DoctorAvailability.query.get_or_404(av_id)

    if av.doctor_id != doctor.id:
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(av)
    db.session.commit()

    try:
        cache.delete('doctor_availabilities')
    except Exception:
        pass

    return jsonify({'message': 'Availability removed'}), 200
