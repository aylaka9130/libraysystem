from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route("/")
def home(): 
    print("heloooooooooooo 1st")
    return render_template("index.html")


# Database initialization
def init_db():
    conn = sqlite3.connect('library.db')
    c = conn.cursor()
    
    # Drop old table if exists and create new one
    c.execute('DROP TABLE IF EXISTS books')
    
    c.execute('''
        CREATE TABLE books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sign_number TEXT NOT NULL,
            book_name TEXT NOT NULL,
            author TEXT,
            publisher TEXT,
            category TEXT,
            rack_no TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add sample data
    sample_books = [
        ('LIB001', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Scribner', 'Fiction', 'A-12'),
        ('LIB002', 'To Kill a Mockingbird', 'Harper Lee', 'J.B. Lippincott & Co.', 'Fiction', 'A-15'),
        ('LIB003', '1984', 'George Orwell', 'Secker & Warburg', 'Science Fiction', 'B-08'),
        ('LIB004', 'Pride and Prejudice', 'Jane Austen', 'T. Egerton', 'Romance', 'C-21'),
        ('LIB005', 'The Catcher in the Rye', 'J.D. Salinger', 'Little, Brown', 'Fiction', 'A-18'),
        ('LIB006', 'The Hobbit', 'J.R.R. Tolkien', 'George Allen & Unwin', 'Fantasy', 'B-12'),
        ('LIB007', 'Harry Potter and the Sorcerer\'s Stone', 'J.K. Rowling', 'Bloomsbury', 'Fantasy', 'B-15'),
        ('LIB008', 'The Lord of the Rings', 'J.R.R. Tolkien', 'George Allen & Unwin', 'Fantasy', 'B-18'),
        ('LIB009', 'The Chronicles of Narnia', 'C.S. Lewis', 'Geoffrey Bles', 'Fantasy', 'B-21'),
        ('LIB010', 'Animal Farm', 'George Orwell', 'Secker & Warburg', 'Political Satire', 'C-08'),
        ('LIB011', 'Brave New World', 'Aldous Huxley', 'Chatto & Windus', 'Science Fiction', 'B-24'),
        ('LIB012', 'The Alchemist', 'Paulo Coelho', 'HarperCollins', 'Fiction', 'A-21'),
        ('LIB013', 'One Hundred Years of Solitude', 'Gabriel García Márquez', 'Harper & Row', 'Magical Realism', 'C-15'),
        ('LIB014', 'The Kite Runner', 'Khaled Hosseini', 'Riverhead Books', 'Fiction', 'A-24'),
        ('LIB015', 'Life of Pi', 'Yann Martel', 'Knopf Canada', 'Fiction', 'A-27')
    ]
    
    c.executemany('''
        INSERT INTO books (sign_number, book_name, author, publisher, category, rack_no)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', sample_books)
    
    conn.commit()
    conn.close()

# Helper function to get database connection
def get_db():
    conn = sqlite3.connect('library.db')
    conn.row_factory = sqlite3.Row
    return conn

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Server is running'}), 200

# Get all books
@app.route('/api/books', methods=['GET'])
def get_books():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM books ORDER BY id DESC')
    books = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(books), 200

# Get single book
@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM books WHERE id = ?', (book_id,))
    book = c.fetchone()
    conn.close()
    
    if book:
        return jsonify(dict(book)), 200
    else:
        return jsonify({'error': 'Book not found'}), 404

# Add new book
@app.route('/api/books', methods=['POST'])
def add_book():
    data = request.get_json()
    
    if not data.get('sign_number') or not data.get('book_name'):
        return jsonify({'error': 'Sign number and book name are required'}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        INSERT INTO books (sign_number, book_name, author, publisher, category, rack_no)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('sign_number'),
        data.get('book_name'),
        data.get('author', ''),
        data.get('publisher', ''),
        data.get('category', ''),
        data.get('rack_no', '')
    ))
    
    book_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': book_id, 'message': 'Book added successfully'}), 201

# Update book
@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.get_json()
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        UPDATE books
        SET sign_number = ?, book_name = ?, author = ?, publisher = ?, category = ?, rack_no = ?
        WHERE id = ?
    ''', (
        data.get('sign_number'),
        data.get('book_name'),
        data.get('author', ''),
        data.get('publisher', ''),
        data.get('category', ''),
        data.get('rack_no', ''),
        book_id
    ))
    
    conn.commit()
    affected_rows = c.rowcount
    conn.close()
    
    if affected_rows > 0:
        return jsonify({'message': 'Book updated successfully'}), 200
    else:
        return jsonify({'error': 'Book not found'}), 404

# Delete book
@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM books WHERE id = ?', (book_id,))
    conn.commit()
    affected_rows = c.rowcount
    conn.close()
    
    if affected_rows > 0:
        return jsonify({'message': 'Book deleted successfully'}), 200
    else:
        return jsonify({'error': 'Book not found'}), 404

# Search books
@app.route('/api/books/search', methods=['GET'])
def search_books():
    query = request.args.get('q', '')
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT * FROM books
        WHERE sign_number LIKE ? OR book_name LIKE ? OR author LIKE ?
        OR publisher LIKE ? OR category LIKE ? OR rack_no LIKE ?
        ORDER BY id DESC
    ''', tuple([f'%{query}%'] * 6))
    
    books = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return jsonify(books), 200

# Export books as JSON
@app.route('/api/books/export', methods=['GET'])
def export_books():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM books ORDER BY id DESC')
    books = [dict(row) for row in c.fetchall()]
    conn.close()
    
    # Create JSON file
    filename = f'library_books_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(filename, 'w') as f:
        json.dump(books, f, indent=2)
    
    return send_file(filename, as_attachment=True, download_name='library_books.json')

if __name__ == '__main__':
    print("heloooooooooooo 2st")
    init_db()
    print("heloooooooooooo 3st")
    app.run(debug=True, host='0.0.0.0', port=5000)
