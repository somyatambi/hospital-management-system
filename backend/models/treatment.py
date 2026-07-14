from backend.extensions import db
from datetime import datetime

class Treatment(db.Model):
    __tablename__ = 'treatments'

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), unique=True, nullable=False)
    diagnosis = db.Column(db.Text, nullable=False)
    prescription = db.Column(db.Text, nullable=True)
    doctor_notes = db.Column(db.Text, nullable=True)
    next_visit_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'diagnosis': self.diagnosis,
            'prescription': self.prescription,
            'doctor_notes': self.doctor_notes,
            'next_visit_date': self.next_visit_date.isoformat() if self.next_visit_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
