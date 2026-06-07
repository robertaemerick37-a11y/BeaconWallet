// Track state: false = Login view, true = Register view
let isRegistering = false;

// DOM Elements
const formTitle = document.getElementById('form-title');
const authForm = document.getElementById('auth-form');
const usernameLabel = document.getElementById('username-label');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const submitBtn = document.getElementById('submit-btn');
const toggleText = document.getElementById('toggle-text'); 
const errorMessage = document.getElementById('error-message');
const modalSubmitBtn = document.querySelector('#forgot-password-form button[type="submit"]');

function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent;
  }

  const labelEl = button.querySelector('.btn-label');
  if (isLoading) {
    button.classList.add('loading');
    if (labelEl) {
      labelEl.textContent = loadingText || 'Processing...';
    } else {
      button.textContent = loadingText || 'Processing...';
    }
  } else {
    button.classList.remove('loading');
    if (labelEl) {
      labelEl.textContent = button.dataset.originalText;
    } else {
      button.textContent = button.dataset.originalText;
    }
  }
}

// HTML Groups to hide/show
const emailGroup = document.getElementById('email-group');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const testimonialText = document.getElementById('testimonial-text');
const testimonialName = document.getElementById('testimonial-name');
const testimonialRole = document.getElementById('testimonial-role');
const testimonialCard = document.getElementById('testimonial-card');
const testimonialDots = document.getElementById('testimonial-dots');

const testimonials = [
  {
    text: "Beacon Wealth made moving money simple and secure. I love the fast transfers and easy UI – it feels made for real people.",
    name: "Amina R.",
    role: "Small Business Owner"
  },
  {
    text: "The app is clean, modern, and reliable. I can send money instantly and the support team is always responsive.",
    name: "Jason L.",
    role: "Freelancer"
  },
  {
    text: "I started using Beacon Wealth to pay contractors, and the whole process is smooth. The dashboard is clear and everything works flawlessly.",
    name: "Nina K.",
    role: "Project Manager"
  },
  {
    text: "I feel confident managing my finances with Beacon Wealth. The login flow is easy and the app always keeps my data safe.",
    name: "Marcus D.",
    role: "Consultant"
  }
];

let activeTestimonial = 0;
let testimonialTimer = null;

function renderTestimonial(index) {
  if (!testimonialText || !testimonialName || !testimonialRole || !testimonialCard) return;

  const item = testimonials[index];
  testimonialCard.classList.add('fade-out');
  setTimeout(() => {
    testimonialText.textContent = item.text;
    testimonialName.textContent = item.name;
    testimonialRole.textContent = item.role;
    testimonialCard.classList.remove('fade-out');
    updateDots(index);
  }, 250);
}

function updateDots(index) {
  if (!testimonialDots) return;
  testimonialDots.innerHTML = testimonials.map((_, dotIndex) => {
    return `<span class="testimonial-dot${dotIndex === index ? ' active' : ''}"></span>`;
  }).join('');
}

function startTestimonialRotation() {
  if (!testimonials.length) return;
  renderTestimonial(activeTestimonial);
  if (testimonialTimer) clearInterval(testimonialTimer);
  testimonialTimer = setInterval(() => {
    activeTestimonial = (activeTestimonial + 1) % testimonials.length;
    renderTestimonial(activeTestimonial);
  }, 5000);
}

window.addEventListener('load', startTestimonialRotation);

// Function to handle switching views smoothly
function toggleAuthView() {
  isRegistering = !isRegistering;
  
  // Clear fields and hide errors
  authForm.reset();
  errorMessage.classList.add('hidden');

  if (isRegistering) {
    formTitle.textContent = 'Create Account';
    usernameLabel.textContent = 'Username';
    submitBtn.textContent = 'Sign Up';
    toggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-link">Log In</a>';
    
    emailGroup.classList.remove('hidden');
    confirmPasswordGroup.classList.remove('hidden');
    emailInput.setAttribute('required', 'true');
    confirmPasswordInput.setAttribute('required', 'true');
  } else {
    formTitle.textContent = 'Welcome Back';
    usernameLabel.textContent = 'Username or Email';
    submitBtn.textContent = 'Log In';
    toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Create Account</a>';
    
    emailGroup.classList.add('hidden');
    confirmPasswordGroup.classList.add('hidden');
    emailInput.removeAttribute('required');
    confirmPasswordInput.removeAttribute('required');
  }
}

// Fixed Link Switcher Listener
toggleText.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'toggle-link') {
    e.preventDefault(); 
    toggleAuthView();
  }
});

// Handle clicking "Forgot Password" link
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'forgot-password-link') {
    e.preventDefault();
    document.getElementById('forgot-password-modal').classList.remove('hidden');
    document.getElementById('modal-email').focus();
  }
});

// Handle modal cancel button
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
  document.getElementById('forgot-password-modal').classList.add('hidden');
  document.getElementById('forgot-password-form').reset();
  document.getElementById('modal-error-message').classList.add('hidden');
});

// Close modal when clicking the backdrop overlay
document.querySelector('.modal-overlay').addEventListener('click', () => {
  document.getElementById('forgot-password-modal').classList.add('hidden');
  document.getElementById('forgot-password-form').reset();
  document.getElementById('modal-error-message').classList.add('hidden');
});

// Handle forgot password form submission
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const modalError = document.getElementById('modal-error-message');
  modalError.classList.add('hidden');

  const email = document.getElementById('modal-email').value.trim();
  if (!email) return;

  setLoading(modalSubmitBtn, true, 'Sending...');
  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to process request.');
    
    alert('A 4-digit recovery code has been sent to your email.');
    localStorage.setItem('resetEmail', email);
    document.getElementById('forgot-password-modal').classList.add('hidden');
    document.getElementById('forgot-password-form').reset();
    window.location.href = 'reset-password.html';
  } catch (err) {
    setLoading(modalSubmitBtn, false);
    modalError.textContent = err.message;
    modalError.classList.remove('hidden');
  }
});

// Handle Form submissions (Login and Registration)
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  errorMessage.classList.add('hidden');

  if (isRegistering) {
    if (passwordInput.value !== confirmPasswordInput.value) {
      errorMessage.textContent = "Passwords don't match!";
      errorMessage.classList.remove('hidden');
      return;
    }

    setLoading(submitBtn, true, 'Signing Up...');
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value,
        email: emailInput.value,
        password: passwordInput.value
      })
    })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed.');
      
      setLoading(submitBtn, false);
      alert('Account created successfully! Taking you back to Login.');
      toggleAuthView();
    })
    .catch((err) => {
      setLoading(submitBtn, false);
      errorMessage.textContent = err.message;
      errorMessage.classList.remove('hidden');
    });

  } else {
    setLoading(submitBtn, true, 'Logging In...');
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: usernameInput.value,
        password: passwordInput.value
      })
    })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed.');
      
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('username', data.username || usernameInput.value);
      localStorage.setItem('userPassword', passwordInput.value);
      window.location.href = 'verify.html';
    })
    .catch((err) => {
      setLoading(submitBtn, false);
      errorMessage.textContent = err.message;
      errorMessage.classList.remove('hidden');
      passwordInput.value = '';
    });
  }
});