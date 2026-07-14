from celery import Celery
from celery.schedules import crontab
import csv
import os
from datetime import datetime, date, timedelta

celery_app = Celery('hospital_tasks')

celery_app.config_from_object({
    'broker_url': 'redis://localhost:6379/1',
    'result_backend': 'redis://localhost:6379/1',

    'timezone': 'Asia/Kolkata',

    'beat_schedule': {
        'daily-reminders': {
            'task': 'backend.tasks.send_daily_reminders',
            'schedule': crontab(hour=8, minute=0),
        },
        'monthly-activity-report': {
            'task': 'backend.tasks.send_monthly_reports',
            'schedule': crontab(day_of_month=1, hour=9, minute=0),
        },
    },
})

def get_app():
    """Lazy import to get the Flask app object. Avoids circular imports."""
    from backend.app import create_app
    return create_app()

@celery_app.task
def send_daily_reminders():
    """
    Scheduled Celery task: email every patient who has an appointment today.

    WHY 'with app.app_context():'?
      Flask extensions like SQLAlchemy and Flask-Mail only work inside a
      Flask application context. Since Celery runs in a separate process
      (no Flask context by default), we must push one manually.
    """

    app = get_app()
    with app.app_context():
        from backend.extensions import db, mail
        from backend.models.appointment import Appointment
        from flask_mail import Message

        today = date.today()

        todays_appointments = Appointment.query.filter_by(
            date=today,
            status='Booked'
        ).all()

        sent_count = 0

        for appt in todays_appointments:
            try:
                patient_email = appt.patient.user.email
                patient_name  = appt.patient.name
                doctor_name   = appt.doctor.name

                appt_time = appt.time.strftime('%I:%M %p')

                msg = Message(
                    subject='Appointment Reminder - ' + today.strftime('%B %d, %Y'),
                    recipients=[patient_email],
                    html=(
                        '<html><body style="font-family: Arial, sans-serif; padding: 20px;">'
                        '<h2 style="color: #0d6efd;">Hospital Management System</h2>'
                        '<p>Dear <strong>' + patient_name + '</strong>,</p>'
                        '<p>This is a reminder that you have an appointment <strong>today</strong>.</p>'
                        '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">'
                        '<p><strong>Doctor:</strong> Dr. ' + doctor_name + '</p>'
                        '<p><strong>Date:</strong> ' + today.strftime('%B %d, %Y') + '</p>'
                        '<p><strong>Time:</strong> ' + appt_time + '</p>'
                        '</div>'
                        '<p>Please visit the hospital at the scheduled time.</p>'
                        '<p>Thank you,<br>Hospital Management System</p>'
                        '</body></html>'
                    )
                )

                mail.send(msg)

                sent_count = sent_count + 1
                print('Reminder sent to ' + patient_email + ' for appointment at ' + appt_time)

            except Exception as e:
                print('Failed to send reminder to ' + appt.patient.user.email + ': ' + str(e))

        return 'Sent ' + str(sent_count) + ' reminders for ' + str(today)

@celery_app.task
def send_monthly_reports():
    """
    Scheduled Celery task: email every doctor a summary of last month's appointments.
    """

    app = get_app()
    with app.app_context():
        from backend.extensions import db, mail
        from backend.models.doctor_profile import DoctorProfile
        from backend.models.appointment import Appointment
        from flask_mail import Message

        today = date.today()

        first_of_this_month = today.replace(day=1)
        last_of_prev_month  = first_of_this_month - timedelta(days=1)
        first_of_prev_month = last_of_prev_month.replace(day=1)

        all_doctors = DoctorProfile.query.all()

        for doctor in all_doctors:
            try:
                appointments = Appointment.query.filter(
                    Appointment.doctor_id == doctor.id,
                    Appointment.date >= first_of_prev_month,
                    Appointment.date <= last_of_prev_month
                ).all()

                total_count     = len(appointments)
                completed_count = 0
                cancelled_count = 0

                for appt in appointments:
                    if appt.status == 'Completed':
                        completed_count = completed_count + 1
                    elif appt.status == 'Cancelled':
                        cancelled_count = cancelled_count + 1

                table_rows = ''
                for appt in appointments:
                    if appt.treatment:
                        treatment_text = (
                            'Diagnosis: ' + appt.treatment.diagnosis + '<br>' +
                            'Prescription: ' + (appt.treatment.prescription or 'N/A')
                        )
                    else:
                        treatment_text = 'N/A'

                    table_rows = table_rows + (
                        '<tr>'
                        '<td style="padding:8px;border:1px solid #dee2e6;">' + appt.date.strftime('%Y-%m-%d') + '</td>'
                        '<td style="padding:8px;border:1px solid #dee2e6;">' + appt.time.strftime('%I:%M %p') + '</td>'
                        '<td style="padding:8px;border:1px solid #dee2e6;">' + appt.patient.name + '</td>'
                        '<td style="padding:8px;border:1px solid #dee2e6;">' + appt.status + '</td>'
                        '<td style="padding:8px;border:1px solid #dee2e6;">' + treatment_text + '</td>'
                        '</tr>'
                    )

                if not table_rows:
                    table_rows = '<tr><td colspan="5" style="padding:10px;text-align:center;">No appointments this month</td></tr>'

                month_name = first_of_prev_month.strftime('%B %Y')

                html_report = (
                    '<html><body style="font-family:Arial,sans-serif;padding:20px;">'
                    '<h2 style="color:#0d6efd;">Monthly Activity Report - ' + month_name + '</h2>'
                    '<p>Dear <strong>Dr. ' + doctor.name + '</strong>,</p>'
                    '<p>Here is your activity summary for <strong>' + month_name + '</strong>:</p>'
                    '<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:15px 0;">'
                    '<h4>Summary</h4>'
                    '<p>Total Appointments: <strong>' + str(total_count) + '</strong></p>'
                    '<p>Completed: <strong>' + str(completed_count) + '</strong></p>'
                    '<p>Cancelled: <strong>' + str(cancelled_count) + '</strong></p>'
                    '</div>'
                    '<h4>Appointment Details</h4>'
                    '<table style="width:100%;border-collapse:collapse;margin:15px 0;">'
                    '<thead>'
                    '<tr style="background:#0d6efd;color:white;">'
                    '<th style="padding:10px;border:1px solid #dee2e6;">Date</th>'
                    '<th style="padding:10px;border:1px solid #dee2e6;">Time</th>'
                    '<th style="padding:10px;border:1px solid #dee2e6;">Patient</th>'
                    '<th style="padding:10px;border:1px solid #dee2e6;">Status</th>'
                    '<th style="padding:10px;border:1px solid #dee2e6;">Treatment</th>'
                    '</tr></thead>'
                    '<tbody>' + table_rows + '</tbody>'
                    '</table>'
                    '<p>Thank you,<br>Hospital Management System</p>'
                    '</body></html>'
                )

                msg = Message(
                    subject='Monthly Activity Report - ' + month_name,
                    recipients=[doctor.user.email],
                    html=html_report
                )
                mail.send(msg)
                print('Monthly report sent to Dr. ' + doctor.name + ' (' + doctor.user.email + ')')

            except Exception as e:
                print('Failed to send report to Dr. ' + doctor.name + ': ' + str(e))

        return 'Sent reports to ' + str(len(all_doctors)) + ' doctors'

@celery_app.task
def export_patient_treatments(patient_id, patient_email):
    """
    Background task: generate a CSV file of a patient's treatment history.
    Steps:
      1. Fetch all completed appointments for this patient.
      2. Write one CSV row per appointment.
      3. Attach the CSV to an email and send it to the patient.
      4. Return the result (status, filename, record count).
    """

    app = get_app()
    with app.app_context():
        from backend.extensions import db, mail
        from backend.models.patient_profile import PatientProfile
        from backend.models.appointment import Appointment
        from flask_mail import Message

        patient = PatientProfile.query.get(patient_id)
        if not patient:
            return {'error': 'Patient not found'}

        appointments = Appointment.query.filter_by(
            patient_id=patient_id,
            status='Completed'
        ).order_by(Appointment.date.desc()).all()

        export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exports')
        os.makedirs(export_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename  = 'treatment_export_' + str(patient_id) + '_' + timestamp + '.csv'
        filepath  = os.path.join(export_dir, filename)

        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            writer.writerow([
                'Patient ID', 'Patient Name', 'Consulting Doctor',
                'Appointment Date', 'Appointment Time', 'Diagnosis',
                'Prescription', 'Doctor Notes', 'Next Visit Date'
            ])

            for appt in appointments:
                treatment = appt.treatment

                if treatment:
                    diagnosis        = treatment.diagnosis
                    prescription     = treatment.prescription if treatment.prescription else 'N/A'
                    doctor_notes     = treatment.doctor_notes if treatment.doctor_notes else 'N/A'
                    if treatment.next_visit_date:
                        next_visit = treatment.next_visit_date.strftime('%Y-%m-%d')
                    else:
                        next_visit = 'N/A'
                else:
                    diagnosis    = 'N/A'
                    prescription = 'N/A'
                    doctor_notes = 'N/A'
                    next_visit   = 'N/A'

                writer.writerow([
                    patient.user_id,
                    patient.name,
                    'Dr. ' + appt.doctor.name,
                    appt.date.strftime('%Y-%m-%d'),
                    appt.time.strftime('%I:%M %p'),
                    diagnosis,
                    prescription,
                    doctor_notes,
                    next_visit,
                ])

        record_count = len(appointments)

        try:
            msg = Message(
                subject='Treatment History Export',
                recipients=[patient_email],
                html=(
                    '<html><body style="font-family:Arial,sans-serif;padding:20px;">'
                    '<h2 style="color:#0d6efd;">Treatment History Export</h2>'
                    '<p>Dear <strong>' + patient.name + '</strong>,</p>'
                    '<p>Your treatment history export is ready. '
                    'Please find the CSV file attached to this email.</p>'
                    '<p>Total records exported: <strong>' + str(record_count) + '</strong></p>'
                    '<p>Thank you,<br>Hospital Management System</p>'
                    '</body></html>'
                )
            )

            with open(filepath, 'r') as csv_file:
                msg.attach(filename, 'text/csv', csv_file.read())

            mail.send(msg)

        except Exception as e:
            print('Failed to send export email: ' + str(e))

        return {
            'status': 'completed',
            'filename': filename,
            'records': record_count,
            'filepath': filepath
        }
