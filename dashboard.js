const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const usernameElement = document.querySelector('.profile-trigger .username');
const dashboardUsernameElement = document.getElementById('dashboard-username');

// Display username from localStorage (if available)
let username = localStorage.getItem('username');
const userEmail = localStorage.getItem('userEmail');
let displayName = username || (userEmail ? userEmail.split('@')[0] : 'User');

async function refreshDashboardProfile() {
  if (!userEmail) return;
  if (!username) {
    try {
      const response = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      if (response.ok && data.username) {
        username = data.username;
        localStorage.setItem('username', username);
        displayName = username;
      }
    } catch (error) {
      console.error('Dashboard profile lookup failed:', error);
    }
  }

  if (displayName) {
    usernameElement.textContent = displayName;
    dashboardUsernameElement.textContent = displayName;
  }
}

refreshDashboardProfile();

// Toggle the dropdown menu visibility when clicking the profile block
profileTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('hidden');
});

// Close the dropdown automatically if the user clicks anywhere outside of it
document.addEventListener('click', (e) => {
  if (!profileDropdown.classList.contains('hidden')) {
    if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.add('hidden');
    }
  }
});

// Helper to draw a rounded rectangle on a 2D context
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// Draw Recovery Progress Chart
function drawRecoveryChart() {
  const canvas = document.getElementById('recovery-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width;
  canvas.height = 340;

  const padding = 40;
  const leftPad = 85; // extra space on the left for y-axis number labels and rotated title
  const bottomPad = 55; // extra space on the bottom for x-axis labels and title
  const graphWidth = canvas.width - padding - leftPad;
  const graphHeight = canvas.height - padding - bottomPad;
  const graphLeft = leftPad;
  const graphTop = padding;
  const graphRight = graphLeft + graphWidth;
  const graphBottom = graphTop + graphHeight;

  const data = [
    { date: 'Apr 1', value: 450000 },
    { date: 'Apr 3', value: 600000 },
    { date: 'Apr 5', value: 850000 },
    { date: 'Apr 7', value: 950000 },
    { date: 'Apr 9', value: 1100000 },
    { date: 'Apr 11', value: 1250000 },
    { date: 'Apr 14', value: 1500000 }
  ];

  const maxValue = 1500000;

  ctx.strokeStyle = 'rgba(37, 99, 235, 0.1)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 6; i++) {
    const x = graphLeft + (graphWidth / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, graphTop);
    ctx.lineTo(x, graphBottom);
    ctx.stroke();
  }

  for (let i = 0; i <= 4; i++) {
    const y = graphTop + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(graphLeft, y);
    ctx.lineTo(graphRight, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(230, 236, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(graphLeft, graphBottom);
  ctx.lineTo(graphRight, graphBottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(graphLeft, graphTop);
  ctx.lineTo(graphLeft, graphBottom);
  ctx.stroke();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = graphLeft + (graphWidth / (data.length - 1)) * index;
    const y = graphBottom - (point.value / maxValue) * graphHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  ctx.fillStyle = '#2563eb';
  data.forEach((point, index) => {
    const x = graphLeft + (graphWidth / (data.length - 1)) * index;
    const y = graphBottom - (point.value / maxValue) * graphHeight;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // X-axis: numeric day labels under each tick
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 6; i++) {
    const x = graphLeft + (graphWidth / 6) * i;
    ctx.fillText(String(i + 1), x, graphBottom + 18);
  }

  // X-axis title
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Day', graphLeft + graphWidth / 2, graphBottom + 38);

  // Y-axis: numeric value labels
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue / 4) * i;
    const y = graphBottom - (graphHeight / 4) * i;
    const label = '$' + (value / 1000).toFixed(0) + 'K';
    ctx.fillText(label, graphLeft - 8, y + 4);
  }

  // Y-axis title (rotated), placed further left to avoid clashing with the number labels
  ctx.save();
  ctx.translate(14, graphTop + graphHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Amount (USD)', 0, 0);
  ctx.restore();
}

const testimonialText = document.getElementById('testimonial-text');
const testimonialName = document.getElementById('testimonial-name');
const testimonialCard = document.getElementById('testimonial-card');
const testimonialDots = document.getElementById('testimonial-dots');

const testimonials = [
  { text: "I was so glad I decided to go with Beacon Wealth. From our very first meeting, they handled my case with absolute professionalism and care. They took the time to explain every detail, taking a massive weight off my shoulders. I couldn’t have asked for a better team to guide me through the process.", name: "Amina R.", image: "amina.jpg" },
  { text: "Choosing Beacon Wealth was the best decision I could have made. They handled my case incredibly well, showing a level of dedication and sharp attention to detail that you don't find just anywhere. I’m honestly just glad I had them in my corner when it mattered most.", image: "jason.jpg" },
  { text: "Navigating financial decisions can be incredibly overwhelming, but Beacon Wealth made it seamless. They handled my case so well, keeping me informed and reassured at every single step. I’m incredibly grateful for their expertise and highly recommend them to anyone looking for peace of mind", name: "Nina K.", image: "nina.jpg" },
  { text: "The team at Beacon Wealth completely exceeded my expectations. They took over my case and handled everything flawlessly, allowing me to focus on my day-to-day without the stress. If you want a team that genuinely knows what they're doing and treats your case with priority, this is it", name: "Marcus D.", image: "marcus.jpg" }
];

let activeTestimonial = 0;
let testimonialTimer = null;

// Render a testimonial avatar as an image when one is provided, otherwise show initials
function setTestimonialAvatar(avatarEl, item) {
  if (item.image) {
    avatarEl.textContent = '';
    avatarEl.classList.add('has-image');
    avatarEl.style.backgroundImage = `url('${item.image}')`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.style.backgroundRepeat = 'no-repeat';
  } else {
    avatarEl.classList.remove('has-image');
    avatarEl.style.backgroundImage = '';
    const initials = item.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    avatarEl.textContent = initials;
  }
}

function renderTestimonial(index) {
  if (!testimonialText || !testimonialName || !testimonialCard) return;

  const item = testimonials[index];
  testimonialCard.classList.add('fade-out');
  setTimeout(() => {
    testimonialText.textContent = item.text;
    testimonialName.textContent = item.name;
    // Update avatar with image (if provided) or initials
    const avatarEl = document.getElementById('testimonial-avatar');
    if (avatarEl) {
      setTestimonialAvatar(avatarEl, item);
    }
    testimonialCard.classList.remove('fade-out');
    updateDots(index);
  }, 250);
}

function updateDots(index) {
  if (!testimonialDots) return;
  const dots = testimonialDots.querySelectorAll('.testimonial-dot');
  dots.forEach((dot, dotIndex) => {
    if (dotIndex === index) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function createDots() {
  if (!testimonialDots) return;
  testimonialDots.innerHTML = testimonials.map((_, dotIndex) => {
    return `<span class="testimonial-dot${dotIndex === activeTestimonial ? ' active' : ''}" data-index="${dotIndex}"></span>`;
  }).join('');
  
  const dots = testimonialDots.querySelectorAll('.testimonial-dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      activeTestimonial = index;
      clearInterval(testimonialTimer);
      renderTestimonial(index);
      startTestimonialRotation();
    });
  });
}

function startTestimonialRotation() {
  if (!testimonials.length) return;
  // Set initial avatar
  const avatarEl = document.getElementById('testimonial-avatar');
  if (avatarEl && testimonials[activeTestimonial]) {
    setTestimonialAvatar(avatarEl, testimonials[activeTestimonial]);
  }
  renderTestimonial(activeTestimonial);
  if (testimonialTimer) clearInterval(testimonialTimer);
  createDots();
  testimonialTimer = setInterval(() => {
    activeTestimonial = (activeTestimonial + 1) % testimonials.length;
    renderTestimonial(activeTestimonial);
  }, 5000);
}

// Function to handle the persistent 15-day compliance countdown
function initComplianceCountdown() {
  const timerElement = document.getElementById('countdown-timer');
  if (!timerElement) return;

  // Check if a running deadline target exists in local storage
  let complianceDeadline = localStorage.getItem('compliance_deadline');

  if (!complianceDeadline) {
    // Start a fresh 15-day window from this execution moment (first login)
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    complianceDeadline = new Date().getTime() + fifteenDaysInMs;
    localStorage.setItem('compliance_deadline', complianceDeadline);
  } else {
    complianceDeadline = parseInt(complianceDeadline, 10);
  }

  function updateTimerDisplay() {
    const now = new Date().getTime();
    const timeLeft = complianceDeadline - now;

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      timerElement.textContent = "00d 00h 00m 00s";
      timerElement.style.color = "#ef4444";
      return;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    const dDisplay = String(days).padStart(2, '0');
    const hDisplay = String(hours).padStart(2, '0');
    const mDisplay = String(minutes).padStart(2, '0');
    const sDisplay = String(seconds).padStart(2, '0');

    timerElement.textContent = `${dDisplay}d ${hDisplay}h ${mDisplay}m ${sDisplay}s`;
  }

  updateTimerDisplay();
  const countdownInterval = setInterval(updateTimerDisplay, 1000);
}

// Testimonial prev/next navigation
const testimonialPrev = document.getElementById('testimonial-prev');
const testimonialNext = document.getElementById('testimonial-next');

if (testimonialPrev) {
  testimonialPrev.addEventListener('click', () => {
    activeTestimonial = (activeTestimonial - 1 + testimonials.length) % testimonials.length;
    clearInterval(testimonialTimer);
    renderTestimonial(activeTestimonial);
    startTestimonialRotation();
  });
}

if (testimonialNext) {
  testimonialNext.addEventListener('click', () => {
    activeTestimonial = (activeTestimonial + 1) % testimonials.length;
    clearInterval(testimonialTimer);
    renderTestimonial(activeTestimonial);
    startTestimonialRotation();
  });
}

// Initialize chart, action behaviors, testimonials, and countdown when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    drawRecoveryChart();
    registerDashboardActions();
    startTestimonialRotation();
    initComplianceCountdown();
  });
} else {
  drawRecoveryChart();
  registerDashboardActions();
  startTestimonialRotation();
  initComplianceCountdown();
}

window.addEventListener('resize', drawRecoveryChart);

function registerDashboardActions() {
  const sendMoneyBtn = document.getElementById('send-money-btn');
  const addCardBtn = document.getElementById('add-card-btn');
  const exchangeBtn = document.getElementById('exchange-btn');

  if (sendMoneyBtn) {
    sendMoneyBtn.addEventListener('click', () => {
      window.location.href = 'send-money.html';
    });
  }

  if (addCardBtn) {
    addCardBtn.addEventListener('click', () => {
      window.location.href = 'add-card.html';
    });
  }

  if (exchangeBtn) {
    exchangeBtn.addEventListener('click', () => {
      window.location.href = 'exchange.html';
    });
  }

  const withdrawBtn = document.getElementById('withdraw-btn');
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      window.location.href = 'withdraw.html';
    });
  }

  const telegramUrl = 'https://t.me/michealcarter';
  const chatNowBtn = document.getElementById('chat-now-btn');
  const agentChatBtn = document.getElementById('agent-chat-btn');

  const openTelegramChat = () => {
    window.open(telegramUrl, '_blank');
  };

  if (chatNowBtn) {
    chatNowBtn.addEventListener('click', openTelegramChat);
  }

  if (agentChatBtn) {
    agentChatBtn.addEventListener('click', openTelegramChat);
  }
}