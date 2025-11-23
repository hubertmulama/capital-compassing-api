// auth.js - Authentication utilities

// Password visibility toggle
function togglePassword(fieldId) {
    const passwordInput = document.getElementById(fieldId);
    const toggleIcon = passwordInput.parentNode.querySelector('.toggle-btn i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) strength += 1;
    else feedback.push('At least 8 characters');

    // Upper case check
    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('One uppercase letter');

    // Lower case check
    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('One lowercase letter');

    // Number check
    if (/\d/.test(password)) strength += 1;
    else feedback.push('One number');

    // Special char check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    else feedback.push('One special character');

    return { strength, feedback };
}

// Update password strength visual
function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length === 0) {
        strengthFill.style.width = '0%';
        strengthFill.style.background = '#e5e7eb';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#6b7280';
        return;
    }

    const { strength, feedback } = checkPasswordStrength(password);
    const percentage = (strength / 5) * 100;

    strengthFill.style.width = percentage + '%';

    if (strength <= 2) {
        strengthFill.style.background = '#ef4444';
        strengthText.textContent = 'Weak - ' + feedback.join(', ');
        strengthText.style.color = '#ef4444';
    } else if (strength <= 4) {
        strengthFill.style.background = '#f59e0b';
        strengthText.textContent = 'Medium - ' + feedback.join(', ');
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.style.background = '#10b981';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
    }
}

// Show alert message
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.classList.remove('hidden');
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            alertDiv.classList.add('hidden');
        }, 5000);
    }
}

// Check if user is already logged in
function checkExistingSession() {
    const sessionToken = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('user');
    
    if (sessionToken && user) {
        const userData = JSON.parse(user);
        showAlert('You are already logged in. Redirecting...', 'success');
        setTimeout(() => {
            if (userData.role === 'admin' || userData.role === 'staff') {
                window.location.href = '/admin/';
            } else {
                window.location.href = '/clients/dashboard.html';
            }
        }, 1000);
    }
}
