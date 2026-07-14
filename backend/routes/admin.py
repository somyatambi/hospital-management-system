from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from backend.extensions import db, cache
from backend.models.user import User
from backend.models.doctor_profile import DoctorProfile
from backend.models.patient_profile import PatientProfile
from backend.models.department import Department
from backend.models.appointment import Appointment
from functools import wraps

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
def admin_required(fn):
    """Decorator: blocks the route unless the logged-in user has role='admin'."""

    @wraps(fn)   
    @jwt_required() 
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    """Return dashboard summary counts for doctors, patients, and appointments."""

    total_doctors = DoctorProfile.query.count()

    total_patients = PatientProfile.query.count()

    total_appointments = Appointment.query.count()

    booked = Appointment.query.filter_by(status='Booked').count()

    completed = Appointment.query.filter_by(status='Completed').count()

    cancelled = Appointment.query.filter_by(status='Cancelled').count()

    total_departments = Department.query.count()

    return jsonify({
        'total_doctors': total_doctors,
        'total_patients': total_patients,
        'total_appointments': total_appointments,
        'appointments_booked': booked,
        'appointments_completed': completed,
        'appointments_cancelled': cancelled,
        'total_departments': total_departments,
    }), 200

@admin_bp.route('/departments', methods=['GET'])
@admin_required
def get_departments():
    """Fetch and return a list of ALL departments from the database."""

    all_departments = Department.query.all()

    result_list = []
    for dept in all_departments:
        result_list.append(dept.to_dict())

    return jsonify(result_list), 200

@admin_bp.route('/departments', methods=['POST'])
@admin_required
def create_department():
    """Create a brand-new department. Expects JSON: { name, description }."""

    data = request.get_json()

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return jsonify({'error': 'Department name is required'}), 400

    existing = Department.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Department already exists'}), 409

    new_dept = Department(name=name, description=description)
    db.session.add(new_dept)
    db.session.commit()

    return jsonify({'message': 'Department created successfully', 'department': new_dept.to_dict()}), 201

@admin_bp.route('/departments/<int:dept_id>', methods=['PUT'])
@admin_required
def update_department(dept_id):
    """Update name/description of an existing department. dept_id comes from the URL."""

    dept = Department.query.get_or_404(dept_id)

    data = request.get_json()

    if 'name' in data:
        dept.name = data['name'].strip()
    if 'description' in data:
        dept.description = data['description'].strip()

    db.session.commit()

    return jsonify({'message': 'Department updated', 'department': dept.to_dict()}), 200

@admin_bp.route('/departments/<int:dept_id>', methods=['DELETE'])
@admin_required
def delete_department(dept_id):
    """Permanently delete a department from the database."""

    dept = Department.query.get_or_404(dept_id)
    db.session.delete(dept)
    db.session.commit()

    return jsonify({'message': 'Department deleted'}), 200

@admin_bp.route('/doctors', methods=['GET'])
@admin_required
def get_doctors():
    """
    Return all doctors. Supports optional URL parameters:
      ?search=John          – filter by name
      ?specialization=Cardiology – filter by specialization
    """

    search = request.args.get('search', '').strip()
    specialization = request.args.get('specialization', '').strip()

    query = DoctorProfile.query

    if search:
        query = query.filter(DoctorProfile.name.ilike('%' + search + '%'))

    if specialization:
        query = query.filter(DoctorProfile.specialization.ilike('%' + specialization + '%'))

    doctors = query.all()

    result = []
    for doc in doctors:
        doctor_dict = doc.to_dict()
        doctor_dict['is_active'] = doc.user.is_active
        doctor_dict['email'] = doc.user.email
        doctor_dict['username'] = doc.user.username
        result.append(doctor_dict)

    return jsonify(result), 200

@admin_bp.route('/doctors', methods=['POST'])
@admin_required
def create_doctor():
    """
    Create a new doctor. This does TWO things:
      1. Creates a User row (for login credentials).
      2. Creates a DoctorProfile row (for medical details).
    Both rows are linked by user_id.
    """

    data = request.get_json()

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    specialization = data.get('specialization', '').strip()
    department_id = data.get('department_id')
    phone = data.get('phone', '').strip()
    qualification = data.get('qualification', '').strip()
    experience_years = data.get('experience_years', 0)
    consultation_fee = data.get('consultation_fee', 0.0)
    bio = data.get('bio', '').strip()

    if not username or not email or not password or not name or not specialization:
        return jsonify({'error': 'Username, email, password, name, and specialization are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    new_user = User(username=username, email=email, role='doctor')
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    new_doctor = DoctorProfile(
        user_id=new_user.id,
        name=name,
        specialization=specialization,
        department_id=department_id,
        phone=phone,
        qualification=qualification,
        experience_years=experience_years,
        consultation_fee=consultation_fee,
        bio=bio,
    )
    db.session.add(new_doctor)
    db.session.commit()

    try:
        cache.delete('all_doctors')
    except Exception:
        pass

    return jsonify({'message': 'Doctor created successfully', 'doctor': new_doctor.to_dict()}), 201

@admin_bp.route('/doctors/<int:doctor_id>', methods=['PUT'])
@admin_required
def update_doctor(doctor_id):
    """Update profile fields for an existing doctor. Only fields sent in the body are changed."""

    doctor = DoctorProfile.query.get_or_404(doctor_id)
    data = request.get_json()

    if 'name' in data:
        doctor.name = data['name'].strip()
    if 'specialization' in data:
        doctor.specialization = data['specialization'].strip()
    if 'department_id' in data:
        doctor.department_id = data['department_id']
    if 'phone' in data:
        doctor.phone = data['phone'].strip()
    if 'qualification' in data:
        doctor.qualification = data['qualification'].strip()
    if 'experience_years' in data:
        doctor.experience_years = data['experience_years']
    if 'consultation_fee' in data:
        doctor.consultation_fee = data['consultation_fee']
    if 'bio' in data:
        doctor.bio = data['bio'].strip()
    if 'email' in data:
        doctor.user.email = data['email'].strip()

    db.session.commit()

    try:
        cache.delete('all_doctors')
    except Exception:
        pass

    return jsonify({'message': 'Doctor updated', 'doctor': doctor.to_dict()}), 200

@admin_bp.route('/doctors/<int:doctor_id>', methods=['DELETE'])
@admin_required
def delete_doctor(doctor_id):
    """
    Deactivate (soft-delete) a doctor. We do NOT actually delete their data
    because we still need their appointment and treatment history. We simply set
    is_active=False on their User account so they cannot log in.
    """

    doctor = DoctorProfile.query.get_or_404(doctor_id)

    doctor.user.is_active = False
    db.session.commit()

    try:
        cache.delete('all_doctors')
    except Exception:
        pass

    return jsonify({'message': 'Doctor has been deactivated'}), 200

@admin_bp.route('/doctors/<int:doctor_id>/activate', methods=['PUT'])
@admin_required
def activate_doctor(doctor_id):
    """Re-activate a previously deactivated doctor account."""

    doctor = DoctorProfile.query.get_or_404(doctor_id)
    doctor.user.is_active = True
    db.session.commit()

    try:
        cache.delete('all_doctors')
    except Exception:
        pass

    return jsonify({'message': 'Doctor has been activated'}), 200

@admin_bp.route('/patients', methods=['GET'])
@admin_required
def get_patients():
    """
    Return all patients. Supports optional search:
      ?search=Alice  – matches name OR phone number
    """

    search = request.args.get('search', '').strip()

    query = PatientProfile.query

    if search:
        query = query.filter(
            db.or_(
                PatientProfile.name.ilike('%' + search + '%'),
                PatientProfile.phone.ilike('%' + search + '%'),
            )
        )

    patients = query.all()

    result = []
    for p in patients:
        patient_dict = p.to_dict()
        patient_dict['is_active'] = p.user.is_active
        patient_dict['email'] = p.user.email
        patient_dict['username'] = p.user.username
        result.append(patient_dict)

    return jsonify(result), 200

@admin_bp.route('/patients/<int:patient_id>', methods=['GET'])
@admin_required
def get_patient(patient_id):
    """Return full details of one patient, including their appointment history."""

    patient = PatientProfile.query.get_or_404(patient_id)

    data = patient.to_dict()
    data['is_active'] = patient.user.is_active
    data['email'] = patient.user.email
    data['username'] = patient.user.username

    appointments = Appointment.query.filter_by(patient_id=patient.id).order_by(Appointment.date.desc()).all()

    appointments_list = []
    for appt in appointments:
        appointments_list.append(appt.to_dict())

    data['appointments'] = appointments_list

    return jsonify(data), 200

@admin_bp.route('/patients/<int:patient_id>', methods=['PUT'])
@admin_required
def update_patient(patient_id):
    """Update basic information for a patient."""

    patient = PatientProfile.query.get_or_404(patient_id)
    data = request.get_json()

    if 'name' in data:
        patient.name = data['name'].strip()
    if 'phone' in data:
        patient.phone = data['phone'].strip()
    if 'address' in data:
        patient.address = data['address'].strip()
    if 'blood_group' in data:
        patient.blood_group = data['blood_group'].strip()

    db.session.commit()

    return jsonify({'message': 'Patient updated', 'patient': patient.to_dict()}), 200

@admin_bp.route('/patients/<int:patient_id>/deactivate', methods=['PUT'])
@admin_required
def deactivate_patient(patient_id):
    """Deactivate a patient account so they cannot log in."""

    patient = PatientProfile.query.get_or_404(patient_id)
    patient.user.is_active = False
    db.session.commit()

    return jsonify({'message': 'Patient has been deactivated'}), 200

@admin_bp.route('/patients/<int:patient_id>/activate', methods=['PUT'])
@admin_required
def activate_patient(patient_id):
    """Re-activate a previously deactivated patient account."""

    patient = PatientProfile.query.get_or_404(patient_id)
    patient.user.is_active = True
    db.session.commit()

    return jsonify({'message': 'Patient has been activated'}), 200

@admin_bp.route('/appointments', methods=['GET'])
@admin_required
def get_appointments():
    """
    Return all appointments. Supports optional URL filters:
      ?status=Booked
      ?doctor_id=3
      ?patient_id=5
    """

    status = request.args.get('status', '').strip()
    doctor_id = request.args.get('doctor_id', type=int)
    patient_id = request.args.get('patient_id', type=int)

    query = Appointment.query

    if status:
        query = query.filter_by(status=status)
    if doctor_id:
        query = query.filter_by(doctor_id=doctor_id)
    if patient_id:
        query = query.filter_by(patient_id=patient_id)

    appointments = query.order_by(Appointment.date.desc(), Appointment.time.desc()).all()

    result = []
    for appt in appointments:
        result.append(appt.to_dict())

    return jsonify(result), 200
