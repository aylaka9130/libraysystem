const API_URL = 'http://localhost:5000/api';
let allBooks = [];
let displayedBooks = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = '';
let sortOrder = '';
let editingId = null;
let modifyMode = false;
let currentPageView = 1; // 1 = form page, 2 = table page

window.onload = function() {
    checkConnection();
    loadBooks();
};

function goToPage2() {
    document.getElementById('page1').classList.add('hidden');
    document.getElementById('page2').classList.add('active');
    currentPageView = 2;
}

function goToPage1() {
    document.getElementById('page1').classList.remove('hidden');
    document.getElementById('page2').classList.remove('active');
    currentPageView = 1;
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

async function checkConnection() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');
        
        if (response.ok) {
            badge.className = 'status-badge connected';
            text.textContent = 'Connected';
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');
        badge.className = 'status-badge disconnected';
        text.textContent = 'Disconnected';
    }
}

async function loadBooks() {
    try {
        const response = await fetch(`${API_URL}/books`);
        allBooks = await response.json();
        displayedBooks = [...allBooks];
        currentPage = 1;
        displayBooks();
    } catch (error) {
        showMessage('Error loading books: ' + error.message, 'error');
        document.getElementById('booksTableBody').innerHTML = 
            '<tr><td colspan="8" class="no-data">❌ Error loading books. Is the server running?</td></tr>';
    }
}

function displayBooks() {
    const tbody = document.getElementById('booksTableBody');
    tbody.innerHTML = '';

    if (displayedBooks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">📚 No books found. Add your first book!</td></tr>';
        updatePagination();
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const booksToShow = displayedBooks.slice(start, end);

    booksToShow.forEach((book, index) => {
        const rowClass = modifyMode ? 'modify-row' : '';
        const clickHandler = modifyMode ? `onclick="selectBookForModify(${book.id})"` : '';
        const style = modifyMode ? 'cursor: pointer;' : '';
        
        const row = `
            <tr class="${rowClass}" ${clickHandler} style="${style}">
                <td><input type="checkbox" class="checkbox book-checkbox" data-id="${book.id}"></td>
                <td>${start + index + 1}</td>
                <td>${book.sign_number}</td>
                <td><strong>${book.book_name}</strong></td>
                <td>${book.author || '-'}</td>
                <td>${book.publisher || '-'}</td>
                <td>${book.category || '-'}</td>
                <td>${book.rack_no || '-'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    updatePagination();
}

function updatePagination() {
    const total = displayedBooks.length;
    const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, total);
    
    document.getElementById('pageInfo').textContent = `Showing ${start}-${end} of ${total} books`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = end >= total;
}

function nextPage() {
    if ((currentPage * itemsPerPage) < displayedBooks.length) {
        currentPage++;
        displayBooks();
        window.scrollTo(0, 0);
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayBooks();
        window.scrollTo(0, 0);
    }
}

function sortTable(column) {
    if (sortColumn === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortOrder = 'asc';
    }

    displayedBooks.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    updateTableHeaders();
    currentPage = 1;
    displayBooks();
}

function updateTableHeaders() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.className = 'sortable';
    });
    const columnMap = {
        'id': 0, 'sign_number': 1, 'book_name': 2, 
        'author': 3, 'publisher': 4, 'category': 5, 'rack_no': 6
    };
    const index = columnMap[sortColumn];
    if (index !== undefined) {
        const th = document.querySelectorAll('th.sortable')[index];
        if (th) th.className = `sortable sort-${sortOrder}`;
    }
}

async function addBook() {
    const book = {
        sign_number: document.getElementById('signNumber').value,
        book_name: document.getElementById('bookName').value,
        author: document.getElementById('author').value,
        publisher: document.getElementById('publisher').value,
        category: document.getElementById('category').value,
        rack_no: document.getElementById('rackNo').value
    };

    if (!book.sign_number || !book.book_name) {
        showMessage('Please fill in Sign Number and Book Name', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });

        if (response.ok) {
            showMessage('Book added successfully!', 'success');
            clearForm();
            loadBooks();
        }
    } catch (error) {
        showMessage('Error adding book: ' + error.message, 'error');
    }
}

function enableModifyMode() {
    modifyMode = true;
    showMessage('Modify Mode: Click on any row to edit', 'success');
    displayBooks();
}

function selectBookForModify(id) {
    if (modifyMode) {
        modifyBook(id);
        modifyMode = false;
        displayBooks();
        goToPage1();
    }
}

function modifyBook(id) {
    editingId = id;
    const book = allBooks.find(b => b.id === id);
    
    if (book) {
        document.getElementById('signNumber').value = book.sign_number;
        document.getElementById('bookName').value = book.book_name;
        document.getElementById('author').value = book.author || '';
        document.getElementById('publisher').value = book.publisher || '';
        document.getElementById('category').value = book.category || '';
        document.getElementById('rackNo').value = book.rack_no || '';
        
        document.getElementById('formTitle').textContent = 'Modify Book';
        document.getElementById('addBtn').style.display = 'none';
        document.getElementById('updateBtn').style.display = 'inline-flex';
        document.getElementById('cancelBtn').style.display = 'inline-flex';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function updateBook() {
    if (!editingId) return;

    const book = {
        sign_number: document.getElementById('signNumber').value,
        book_name: document.getElementById('bookName').value,
        author: document.getElementById('author').value,
        publisher: document.getElementById('publisher').value,
        category: document.getElementById('category').value,
        rack_no: document.getElementById('rackNo').value
    };
    console.log("book")
    console.log(book)

    if (!book.sign_number || !book.book_name) {
        showMessage('Please fill in Sign Number and Book Name', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });

        if (response.ok) {
            showMessage('Book updated successfully!', 'success');
            cancelEdit();
            loadBooks();
        }
    } catch (error) {
        showMessage('Error updating book: ' + error.message, 'error');
    }
}

function cancelEdit() {
    editingId = null;
    clearForm();
    document.getElementById('formTitle').textContent = 'Add New Book';
    document.getElementById('addBtn').style.display = 'inline-flex';
    document.getElementById('updateBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'none';
}

async function deleteSelectedBooks() {
    const checkboxes = document.querySelectorAll('.book-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessage('Please select books to delete', 'error');
        return;
    }

    if (!confirm(`Delete ${checkboxes.length} selected book(s)?`)) return;

    try {
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
        await Promise.all(ids.map(id => fetch(`${API_URL}/books/${id}`, { method: 'DELETE' })));
        showMessage('Books deleted successfully!', 'success');
        loadBooks();
    } catch (error) {
        showMessage('Error deleting books: ' + error.message, 'error');
    }
}

async function deleteSelected() {
    const checkboxes = document.querySelectorAll('.book-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessage('Please select books to delete', 'error');
        return;
    }

    if (!confirm(`Delete ${checkboxes.length} selected book(s)?`)) return;

    try {
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
        await Promise.all(ids.map(id => fetch(`${API_URL}/books/${id}`, { method: 'DELETE' })));
        showMessage('Books deleted successfully!', 'success');
        loadBooks();
        toggleMenu();
    } catch (error) {
        showMessage('Error deleting books: ' + error.message, 'error');
    }
}

function searchBooks() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    displayedBooks = allBooks.filter(book => 
        Object.values(book).some(val => String(val).toLowerCase().includes(term))
    );
    currentPage = 1;
    displayBooks();
}

function searchBooksTable() {
    const term = document.getElementById('tableSearchInput').value.toLowerCase();
    displayedBooks = allBooks.filter(book => 
        Object.values(book).some(val => String(val).toLowerCase().includes(term))
    );
    currentPage = 1;
    displayBooks();
}

function searchBooksMobile() {
    const term = document.getElementById('mobileSearchInput').value.toLowerCase();
    displayedBooks = allBooks.filter(book => 
        Object.values(book).some(val => String(val).toLowerCase().includes(term))
    );
    currentPage = 1;
    displayBooks();
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.book-checkbox').forEach(cb => cb.checked = checked);
}

function clearForm() {
    ['signNumber', 'bookName', 'author', 'publisher', 'category', 'rackNo']
        .forEach(id => document.getElementById(id).value = '');
}

function newPage() {
    if (confirm('Clear the form?')) {
        cancelEdit();
        clearForm();
        showMessage('Form cleared!', 'success');
        toggleMenu();
    }
}

function saveData() {
    showMessage('Data is automatically saved to database!', 'success');
    toggleMenu();
}

async function saveAsData() {
    const filename = prompt('Enter filename:', 'library_backup');
    if (!filename) return;
    
    try {
        const data = await fetch(`${API_URL}/books`).then(r => r.json());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename + '.json';
        a.click();
        showMessage('Data saved as ' + filename + '.json', 'success');
        toggleMenu();
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

function loadData() {
    loadBooks();
    showMessage('Data loaded!', 'success');
    toggleMenu();
}

function printPage() {
    window.print();
    toggleMenu();
}

async function downloadData() {
    try {
        const blob = await fetch(`${API_URL}/books/export`).then(r => r.blob());
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'library_books.json';
        a.click();
        showMessage('Downloaded!', 'success');
        toggleMenu();
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}
