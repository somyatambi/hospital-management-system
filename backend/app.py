import os
from flask import Flask, render_template, send_from_directory
from backend.extensions import db, bcrypt, jwt, cache, mail
from backend.config import Config

def create_app():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app = Flask(__name__,
                static_folder=os.path.join(root_dir, 'frontend'),
                static_url_path='/frontend',
                template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates'))

    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    try:
        import redis as redis_client
        r = redis_client.from_url(app.config.get('REDIS_URL', 'redis://localhost:6379/0'))
        r.ping()
        cache.init_app(app)
    except Exception:
        app.config['CACHE_TYPE'] = 'SimpleCache'
        cache.init_app(app)

    from flask_cors import CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    from backend.routes.auth import auth_bp
    from backend.routes.admin import admin_bp
    from backend.routes.doctor import doctor_bp
    from backend.routes.patient import patient_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(patient_bp)

    @app.route('/exports/<path:filename>')
    def serve_export(filename):
        export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exports')
        return send_from_directory(export_dir, filename)

    @app.route('/')
    def index():
        return render_template('index.html')

    with app.app_context():
        db.create_all()
        seed_data(app)

    return app

def seed_data(app):
    """Create admin user and initial departments if they don't exist."""
    from backend.models.user import User
    from backend.models.department import Department

    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@hospital.com',
            role='admin'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        print("Admin user created: username='admin', password='admin123'")

    if Department.query.count() == 0:
        departments = [
            Department(name='General Medicine', description='General medical consultation and treatment'),
            Department(name='Cardiology', description='Heart and cardiovascular system'),
            Department(name='Orthopedics', description='Bones, joints, and muscles'),
            Department(name='Dermatology', description='Skin, hair, and nail conditions'),
            Department(name='Neurology', description='Brain and nervous system'),
            Department(name='Pediatrics', description='Medical care for infants, children, and adolescents'),
            Department(name='ENT', description='Ear, Nose, and Throat'),
            Department(name='Ophthalmology', description='Eye care and vision'),
            Department(name='Gynecology', description="Women's health and reproductive system"),
            Department(name='Psychiatry', description='Mental health and behavioral disorders'),
        ]
        db.session.add_all(departments)
        print("Initial departments seeded")

    db.session.commit()

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
