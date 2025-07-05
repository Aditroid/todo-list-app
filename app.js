const todoForm = document.getElementById('todoForm');
const taskInput = document.getElementById('taskInput');
const todoList = document.getElementById('todoList');
const searchInput = document.getElementById('searchInput');
const filterDate = document.getElementById('filterDate');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const loadingElement = document.getElementById('loading');
const toast = document.getElementById('toast');

let todos = [];
let filteredTodos = [];
let currentPage = 1;
const itemsPerPage = 10;

const API_URL = 'https://dummyjson.com/todos';

async function init() {
    setupEventListeners();
    await fetchTodos();
    updatePagination();
    renderTodos();
}

function setupEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    searchInput.addEventListener('input', filterTodos);
    filterDate.addEventListener('change', filterTodos);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
}

async function fetchTodos() {
    try {
        showLoading(true);
        const response = await fetch(`${API_URL}?limit=25`);
        if (!response.ok) throw new Error('Failed to fetch todos');
        
        const data = await response.json();
        todos = data.todos.map(todo => ({
            ...todo,
            created: new Date().toISOString().split('T')[0] 
        }));
        
        filteredTodos = [...todos];
        showLoading(false);
    } catch (error) {
        console.error('Error fetching todos:', error);
        showError('Failed to load todos. Please try again later.');
        showLoading(false);
    }
}

async function handleAddTodo(e) {
    e.preventDefault();
    
    const task = taskInput.value.trim();
    if (!task) return;
    
    try {
        showLoading(true);
        const response = await fetch(API_URL + '/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                todo: task,
                completed: false,
                userId: 1,
            })
        });
        
        if (!response.ok) throw new Error('Failed to add todo');
        
        const newTodo = await response.json();
        newTodo.created = new Date().toISOString().split('T')[0];
        
        todos.unshift(newTodo);
        filterTodos();
        taskInput.value = '';
        showToast('Task added successfully!');
    } catch (error) {
        console.error('Error adding todo:', error);
        showError('Failed to add task. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function toggleTodoCompletion(todoId, completed) {
    try {
        const response = await fetch(`${API_URL}/${todoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !completed })
        });
        
        if (!response.ok) throw new Error('Failed to update todo');
        
        const updatedTodo = await response.json();
        const index = todos.findIndex(todo => todo.id === todoId);
        if (index !== -1) {
            // Preserve the created date when updating the todo
            todos[index] = {
                ...updatedTodo,
                created: todos[index].created || new Date().toISOString().split('T')[0]
            };
            filterTodos();
        }
    } catch (error) {
        console.error('Error updating todo:', error);
        showError('Failed to update task status.');
    }
}

async function deleteTodo(todoId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_URL}/${todoId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete todo');
        
        todos = todos.filter(todo => todo.id !== todoId);
        filterTodos();
        showToast('Task deleted successfully!');
    } catch (error) {
        console.error('Error deleting todo:', error);
        showError('Failed to delete task.');
    }
}

function filterTodos() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedDate = filterDate.value;
    
    filteredTodos = todos.filter(todo => {
        const matchesSearch = todo.todo.toLowerCase().includes(searchTerm);
        const matchesDate = !selectedDate || todo.created === selectedDate;
        
        return matchesSearch && matchesDate;
    });
    
    currentPage = 1; 
    updatePagination();
    renderTodos();
}

function renderTodos() {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedTodos = filteredTodos.slice(startIdx, startIdx + itemsPerPage);
    
    if (paginatedTodos.length === 0) {
        todoList.innerHTML = `
            <li class="p-6 text-center text-gray-500">
                <i class="fas fa-tasks text-4xl mb-2 text-gray-300"></i>
                <p>No tasks found. Add a new task to get started!</p>
            </li>
        `;
        return;
    }
    
    todoList.innerHTML = paginatedTodos.map(todo => `
        <li class="todo-item p-4 hover:bg-gray-50 flex items-center justify-between">
            <div class="flex items-center">
                <label class="checkbox-container">
                    <input type="checkbox" 
                           ${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodoCompletion(${todo.id}, ${todo.completed})">
                    <span class="checkmark"></span>
                </label>
                <span class="ml-3 text-white ${todo.completed ? 'completed' : ''}">${todo.todo}</span>
            </div>
            <div class="todo-actions flex items-center space-x-2 ml-4">
                <span class="text-xs text-gray-500">${formatDate(todo.created)}</span>
                <button onclick="deleteTodo(${todo.id})" 
                        class="text-red-500 hover:text-red-700 transition-colors">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </li>
    `).join('');
}

function updatePagination() {
    const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
}

function changePage(direction) {
    const newPage = currentPage + direction;
    const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
    
    if (newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        renderTodos();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
    if (show) {
        todoList.innerHTML = '';
    }
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}


function showToast(message) {
    const toastElement = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toastElement.classList.remove('translate-y-16', 'opacity-0');
    toastElement.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toastElement.classList.remove('translate-y-0', 'opacity-100');
        toastElement.classList.add('translate-y-16', 'opacity-0');
    }, 3000);
}


document.addEventListener('DOMContentLoaded', init);
