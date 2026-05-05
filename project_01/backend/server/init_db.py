from app import app, db

with app.app_context():
    print("Creating all database tables...")
    db.create_all()
    print("Tables created successfully!")
