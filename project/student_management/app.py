from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
db = SQLAlchemy(app)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100))
    course = db.Column(db.String(100))
    age = db.Column(db.Integer)

@app.route('/')
def index():
    students = Student.query.all()
    return render_template('index.html', students=students)

@app.route('/add', methods=['GET','POST'])
def add_student():
    if request.method == 'POST':
        s = Student(
            name=request.form['name'],
            email=request.form['email'],
            course=request.form['course'],
            age=request.form['age']
        )
        db.session.add(s)
        db.session.commit()
        return redirect('/')
    return render_template('add_student.html')
@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit_student(id):
    student = Student.query.get_or_404(id)

    if request.method == 'POST':
        student.name = request.form['name']
        student.email = request.form['email']
        student.course = request.form['course']
        student.age = request.form['age']
        db.session.commit()
        return redirect(url_for('index'))

    return render_template('edit_student.html', student=student)





@app.route('/delete/<int:id>')
def delete(id):
    s = Student.query.get(id)
    db.session.delete(s)
    db.session.commit()
    return redirect('/')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
