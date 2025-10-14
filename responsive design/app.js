// =============================================================================
// AirAuth - Gesture Authentication System JavaScript
// Complete functionality for modern air gesture authentication
// =============================================================================

class AirAuthApp {
    constructor() {
        // Application state
        this.currentUser = null;
        this.currentPage = 'home';
        this.webcamStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.signatureCount = 0;
        this.isRecording = false;
        this.authHistory = [];
        this.users = new Map();
        this.isAuthenticated = false;

        // Initialize the application
        this.init();
    }

    // ==========================================================================
    // Initialization and Setup
    // ==========================================================================

    init() {
        console.log('🚀 AirAuth Application Starting...');
        this.setupEventListeners();
        this.loadUserData();
        this.checkAuthStatus();
        this.showPage('home');
        this.showNotification('Welcome to AirAuth! Your secure gesture authentication system.', 'info');
    }

    setupEventListeners() {
        // Navigation listeners
        document.addEventListener('click', this.handleNavigation.bind(this));

        // Form submissions
        const registerForm = document.getElementById('register-form');
        const loginForm = document.getElementById('login-form');

        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegistration.bind(this));
        }

        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Real-time validation
        this.setupFormValidation();

        // Air authentication button
        const airAuthBtn = document.getElementById('air-auth-btn');
        if (airAuthBtn) {
            airAuthBtn.addEventListener('click', this.handleAirAuth.bind(this));
        }

        // Enrollment controls
        this.setupEnrollmentControls();

        // Authentication controls
        this.setupAuthControls();

        // Navigation toggle for mobile
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', this.toggleMobileNav.bind(this));
        }

        // Notification close
        const notificationClose = document.querySelector('.notification-close');
        if (notificationClose) {
            notificationClose.addEventListener('click', this.hideNotification.bind(this));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    setupFormValidation() {
        // Password strength validation
        const passwordInput = document.getElementById('reg-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', this.validatePassword.bind(this));
        }

        // Confirm password validation
        const confirmPasswordInput = document.getElementById('reg-confirm-password');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', this.validateConfirmPassword.bind(this));
        }

        // Email validation
        const emailInput = document.getElementById('reg-email');
        if (emailInput) {
            emailInput.addEventListener('input', this.validateEmail.bind(this));
        }

        // Username validation
        const usernameInput = document.getElementById('reg-username');
        if (usernameInput) {
            usernameInput.addEventListener('input', this.validateUsername.bind(this));
        }
    }

    setupEnrollmentControls() {
        const startCamera = document.getElementById('start-camera');
        const startRecording = document.getElementById('start-recording');
        const stopRecording = document.getElementById('stop-recording');
        const saveSignature = document.getElementById('save-signature');
        const finishEnrollment = document.getElementById('finish-enrollment');

        if (startCamera) startCamera.addEventListener('click', () => this.startCamera('enrollment'));
        if (startRecording) startRecording.addEventListener('click', this.startRecording.bind(this));
        if (stopRecording) stopRecording.addEventListener('click', this.stopRecording.bind(this));
        if (saveSignature) saveSignature.addEventListener('click', this.saveSignature.bind(this));
        if (finishEnrollment) finishEnrollment.addEventListener('click', this.finishEnrollment.bind(this));
    }

    setupAuthControls() {
        const startAuthCamera = document.getElementById('start-auth-camera');
        const authenticateBtn = document.getElementById('authenticate-btn');

        if (startAuthCamera) startAuthCamera.addEventListener('click', () => this.startCamera('auth'));
        if (authenticateBtn) authenticateBtn.addEventListener('click', this.authenticateGesture.bind(this));
    }

    // ==========================================================================
    // Navigation and Page Management
    // ==========================================================================

    handleNavigation(e) {
        if (e.target.hasAttribute('data-page')) {
            e.preventDefault();
            const targetPage = e.target.getAttribute('data-page');
            this.showPage(targetPage);
        }
    }

    showPage(pageId) {
        console.log(`📄 Navigating to: ${pageId}`);

        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // Update navigation
            this.updateNavigation(pageId);

            // Page-specific initialization
            this.initializePage(pageId);

            // Update URL without navigation
            if (history.pushState) {
                history.pushState(null, null, `#${pageId}`);
            }
        } else {
            console.warn(`Page "${pageId}" not found`);
            this.showNotification(`Page "${pageId}" not found`, 'error');
        }
    }

    updateNavigation(activePageId) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === activePageId) {
                link.classList.add('active');
            }
        });
    }

    initializePage(pageId) {
        switch(pageId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'enrollment':
                this.resetEnrollment();
                break;
            case 'auth-test':
                this.resetAuthTest();
                break;
            case 'login':
                this.checkLoginRedirect();
                break;
            case 'register':
                this.resetRegistrationForm();
                break;
        }
    }

    toggleMobileNav() {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.toggle('active');
        }
    }

    // ==========================================================================
    // User Registration and Authentication
    // ==========================================================================

    async handleRegistration(e) {
        e.preventDefault();
        console.log('📝 Processing registration...');

        const formData = new FormData(e.target);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!this.validateRegistrationForm(username, email, password, confirmPassword)) {
            return;
        }

        // Check if user already exists
        if (this.users.has(username) || Array.from(this.users.values()).some(user => user.email === email)) {
            this.showNotification('Username or email already exists!', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username,
            email: email,
            password: password, // In real app, this would be hashed
            signatures: [],
            enrollmentComplete: false,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            authHistory: []
        };

        this.users.set(username, newUser);
        this.saveUserData();

        this.showNotification('Registration successful! Please complete enrollment.', 'success');

        // Auto login and redirect to enrollment
        this.currentUser = newUser;
        this.isAuthenticated = true;
        this.updateAuthStatus();

        setTimeout(() => {
            this.showPage('enrollment');
        }, 1500);
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('🔐 Processing login...');

        const formData = new FormData(e.target);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        // Find user
        const user = this.users.get(username) || Array.from(this.users.values()).find(u => u.email === username);

        if (!user || user.password !== password) {
            this.showNotification('Invalid username/email or password!', 'error');
            this.addAuthHistory('Password Login', false, 'Invalid credentials');
            return;
        }

        // Successful login
        this.currentUser = user;
        this.isAuthenticated = true;
        user.lastLogin = new Date().toISOString();
        this.updateAuthStatus();
        this.saveUserData();

        this.addAuthHistory('Password Login', true, 'Successful login');
        this.showNotification(`Welcome back, ${user.username}!`, 'success');

        setTimeout(() => {
            if (user.enrollmentComplete) {
                this.showPage('dashboard');
            } else {
                this.showPage('enrollment');
            }
        }, 1500);
    }

    async handleAirAuth() {
        console.log('✋ Starting air authentication...');

        if (!this.currentUser || !this.currentUser.enrollmentComplete) {
            this.showNotification('Please complete enrollment first!', 'error');
            this.showPage('enrollment');
            return;
        }

        this.showPage('auth-test');
    }

    checkLoginRedirect() {
        if (this.isAuthenticated && this.currentUser) {
            this.showPage('dashboard');
        }
    }

    // ==========================================================================
    // Form Validation
    // ==========================================================================

    validateRegistrationForm(username, email, password, confirmPassword) {
        let isValid = true;

        // Username validation
        if (!this.validateUsername(null, username)) isValid = false;

        // Email validation
        if (!this.validateEmail(null, email)) isValid = false;

        // Password validation
        if (!this.validatePassword(null, password)) isValid = false;

        // Confirm password validation
        if (!this.validateConfirmPassword(null, confirmPassword, password)) isValid = false;

        return isValid;
    }

    validateUsername(e, value = null) {
        const input = e ? e.target : document.getElementById('reg-username');
        const username = value || (input ? input.value.trim() : '');
        const errorElement = input ? input.parentNode.querySelector('.form-error') : null;

        let isValid = true;
        let message = '';

        if (username.length < 3) {
            isValid = false;
            message = 'Username must be at least 3 characters long';
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            isValid = false;
            message = 'Username can only contain letters, numbers, and underscores';
        } else if (this.users.has(username)) {
            isValid = false;
            message = 'Username already exists';
        }

        if (input && errorElement) {
            input.classList.toggle('error', !isValid);
            errorElement.textContent = message;
        }

        return isValid;
    }

    validateEmail(e, value = null) {
        const input = e ? e.target : document.getElementById('reg-email');
        const email = value || (input ? input.value.trim() : '');
        const errorElement = input ? input.parentNode.querySelector('.form-error') : null;

        let isValid = true;
        let message = '';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            isValid = false;
            message = 'Please enter a valid email address';
        } else if (Array.from(this.users.values()).some(user => user.email === email)) {
            isValid = false;
            message = 'Email already registered';
        }

        if (input && errorElement) {
            input.classList.toggle('error', !isValid);
            errorElement.textContent = message;
        }

        return isValid;
    }

    validatePassword(e, value = null) {
        const input = e ? e.target : document.getElementById('reg-password');
        const password = value || (input ? input.value : '');
        const errorElement = input ? input.parentNode.querySelector('.form-error') : null;
        const strengthBar = input ? input.parentNode.querySelector('.strength-bar') : null;
        const strengthText = input ? input.parentNode.querySelector('.strength-text') : null;

        let isValid = true;
        let message = '';
        let strength = 0;
        let strengthLabel = '';

        if (password.length < 8) {
            isValid = false;
            message = 'Password must be at least 8 characters long';
        } else {
            // Calculate password strength
            if (password.length >= 8) strength += 20;
            if (/[a-z]/.test(password)) strength += 20;
            if (/[A-Z]/.test(password)) strength += 20;
            if (/\d/.test(password)) strength += 20;
            if (/[^\w\s]/.test(password)) strength += 20;

            if (strength <= 40) {
                strengthLabel = 'Weak';
            } else if (strength <= 60) {
                strengthLabel = 'Fair';
            } else if (strength <= 80) {
                strengthLabel = 'Good';
            } else {
                strengthLabel = 'Strong';
            }
        }

        if (input && errorElement) {
            input.classList.toggle('error', !isValid);
            errorElement.textContent = message;
        }

        if (strengthBar && strengthText) {
            strengthBar.style.setProperty('--strength', `${strength}%`);
            strengthBar.className = `strength-bar strength-${strengthLabel.toLowerCase()}`;
            strengthText.textContent = `Password strength: ${strengthLabel}`;

            // Update strength bar color
            let color = '#ef4444'; // red
            if (strength > 40) color = '#f59e0b'; // yellow
            if (strength > 60) color = '#3b82f6'; // blue
            if (strength > 80) color = '#10b981'; // green

            strengthBar.style.background = `linear-gradient(to right, ${color} ${strength}%, #e5e7eb ${strength}%)`;
        }

        return isValid;
    }

    validateConfirmPassword(e, value = null, originalPassword = null) {
        const input = e ? e.target : document.getElementById('reg-confirm-password');
        const confirmPassword = value || (input ? input.value : '');
        const password = originalPassword || (document.getElementById('reg-password') ? document.getElementById('reg-password').value : '');
        const errorElement = input ? input.parentNode.querySelector('.form-error') : null;

        let isValid = true;
        let message = '';

        if (confirmPassword !== password) {
            isValid = false;
            message = 'Passwords do not match';
        }

        if (input && errorElement) {
            input.classList.toggle('error', !isValid);
            errorElement.textContent = message;
        }

        return isValid;
    }

    resetRegistrationForm() {
        const form = document.getElementById('register-form');
        if (form) {
            form.reset();
            // Clear all error states
            const inputs = form.querySelectorAll('input');
            const errors = form.querySelectorAll('.form-error');

            inputs.forEach(input => input.classList.remove('error'));
            errors.forEach(error => error.textContent = '');

            // Reset password strength indicator
            const strengthBar = form.querySelector('.strength-bar');
            const strengthText = form.querySelector('.strength-text');
            if (strengthBar) strengthBar.style.background = '#e5e7eb';
            if (strengthText) strengthText.textContent = 'Password strength';
        }
    }

    // ==========================================================================
    // Webcam and Video Management
    // ==========================================================================

    async startCamera(context = 'enrollment') {
        console.log(`📹 Starting camera for: ${context}`);

        try {
            // Request camera permissions
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            // Get video element based on context
            const videoElement = context === 'enrollment' 
                ? document.getElementById('enrollment-video')
                : document.getElementById('auth-video');

            if (videoElement) {
                videoElement.srcObject = this.webcamStream;

                // Hide overlay
                const overlay = videoElement.parentNode.querySelector('.video-overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                }

                this.showNotification('Camera started successfully!', 'success');
                this.updateEnrollmentStatus('Camera ready. You can now start recording.', 'info');

                // Enable recording controls
                this.updateControlStates(context, 'camera-ready');
            }

        } catch (error) {
            console.error('Camera access error:', error);
            let message = 'Unable to access camera. ';

            if (error.name === 'NotAllowedError') {
                message += 'Please grant camera permissions and try again.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on this device.';
            } else {
                message += 'Please check your camera and try again.';
            }

            this.showNotification(message, 'error');
            this.updateEnrollmentStatus(message, 'error');
        }
    }

    stopCamera() {
        if (this.webcamStream) {
            console.log('🔴 Stopping camera...');
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;

            // Clear video elements
            const enrollmentVideo = document.getElementById('enrollment-video');
            const authVideo = document.getElementById('auth-video');

            if (enrollmentVideo) enrollmentVideo.srcObject = null;
            if (authVideo) authVideo.srcObject = null;

            // Show overlays
            document.querySelectorAll('.video-overlay').forEach(overlay => {
                overlay.classList.remove('hidden');
            });

            this.showNotification('Camera stopped', 'info');
        }
    }

    updateControlStates(context, state) {
        if (context === 'enrollment') {
            const startCamera = document.getElementById('start-camera');
            const startRecording = document.getElementById('start-recording');
            const stopRecording = document.getElementById('stop-recording');
            const saveSignature = document.getElementById('save-signature');
            const finishEnrollment = document.getElementById('finish-enrollment');

            switch(state) {
                case 'initial':
                    if (startCamera) startCamera.disabled = false;
                    if (startRecording) startRecording.disabled = true;
                    if (stopRecording) stopRecording.disabled = true;
                    if (saveSignature) saveSignature.disabled = true;
                    if (finishEnrollment) finishEnrollment.disabled = true;
                    break;
                case 'camera-ready':
                    if (startCamera) startCamera.disabled = true;
                    if (startRecording) startRecording.disabled = false;
                    if (stopRecording) stopRecording.disabled = true;
                    if (saveSignature) saveSignature.disabled = true;
                    break;
                case 'recording':
                    if (startRecording) startRecording.disabled = true;
                    if (stopRecording) stopRecording.disabled = false;
                    if (saveSignature) saveSignature.disabled = true;
                    break;
                case 'recorded':
                    if (startRecording) startRecording.disabled = false;
                    if (stopRecording) stopRecording.disabled = true;
                    if (saveSignature) saveSignature.disabled = false;
                    break;
                case 'enrollment-complete':
                    if (finishEnrollment) finishEnrollment.disabled = false;
                    break;
            }
        } else if (context === 'auth') {
            const startAuthCamera = document.getElementById('start-auth-camera');
            const authenticateBtn = document.getElementById('authenticate-btn');

            switch(state) {
                case 'initial':
                    if (startAuthCamera) startAuthCamera.disabled = false;
                    if (authenticateBtn) authenticateBtn.disabled = true;
                    break;
                case 'camera-ready':
                    if (startAuthCamera) startAuthCamera.disabled = true;
                    if (authenticateBtn) authenticateBtn.disabled = false;
                    break;
            }
        }
    }

    // ==========================================================================
    // Signature Enrollment
    // ==========================================================================

    async startRecording() {
        if (!this.webcamStream) {
            this.showNotification('Please start the camera first!', 'error');
            return;
        }

        console.log('🎥 Starting signature recording...');

        try {
            // Configure MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp8,vorbis'
            };

            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(this.webcamStream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('📹 Recording stopped, chunks:', this.recordedChunks.length);
                this.updateControlStates('enrollment', 'recorded');
                this.updateEnrollmentStatus('Recording complete! Click "Save Signature" to save it.', 'success');
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;

            this.updateControlStates('enrollment', 'recording');
            this.updateEnrollmentStatus('Recording... Draw your signature in the air!', 'info');
            this.showNotification('Recording started! Draw your air signature now.', 'info');

        } catch (error) {
            console.error('Recording error:', error);
            this.showNotification('Recording failed. Please try again.', 'error');
            this.updateEnrollmentStatus('Recording failed. Please try again.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('⏹️ Stopping recording...');
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    async saveSignature() {
        if (this.recordedChunks.length === 0) {
            this.showNotification('No recording to save!', 'error');
            return;
        }

        console.log('💾 Saving signature...');

        try {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);

            // Save signature data
            const signatureData = {
                id: Date.now().toString(),
                videoUrl: videoUrl,
                blob: blob,
                timestamp: new Date().toISOString(),
                duration: this.recordedChunks.length // Approximation
            };

            // Add to current user's signatures
            if (this.currentUser) {
                this.currentUser.signatures.push(signatureData);
                this.signatureCount = this.currentUser.signatures.length;
                this.saveUserData();

                // Update UI
                this.updateSignatureGallery();
                this.updateProgressIndicator();
                this.updateEnrollmentStatus(`Signature ${this.signatureCount}/5 saved successfully!`, 'success');
                this.showNotification(`Signature ${this.signatureCount} saved! ${5 - this.signatureCount} more to go.`, 'success');

                // Check if enrollment is complete
                if (this.signatureCount >= 5) {
                    this.currentUser.enrollmentComplete = true;
                    this.updateControlStates('enrollment', 'enrollment-complete');
                    this.updateEnrollmentStatus('Enrollment complete! Click "Finish Enrollment" to complete setup.', 'success');
                    this.showNotification('🎉 Enrollment complete! You can now use air signature authentication.', 'success');
                }

                // Reset for next recording
                this.recordedChunks = [];
                this.updateControlStates('enrollment', 'camera-ready');

            } else {
                throw new Error('No user logged in');
            }

        } catch (error) {
            console.error('Save signature error:', error);
            this.showNotification('Failed to save signature. Please try again.', 'error');
            this.updateEnrollmentStatus('Failed to save signature. Please try again.', 'error');
        }
    }

    finishEnrollment() {
        if (!this.currentUser || !this.currentUser.enrollmentComplete) {
            this.showNotification('Please complete all 5 signatures first!', 'error');
            return;
        }

        console.log('✅ Finishing enrollment...');

        this.stopCamera();
        this.saveUserData();
        this.updateAuthStatus();

        this.showNotification('🎉 Enrollment completed successfully! You can now use air signature authentication.', 'success');

        setTimeout(() => {
            this.showPage('dashboard');
        }, 2000);
    }

    resetEnrollment() {
        console.log('🔄 Resetting enrollment...');

        this.signatureCount = this.currentUser ? this.currentUser.signatures.length : 0;
        this.recordedChunks = [];
        this.isRecording = false;

        this.stopCamera();
        this.updateControlStates('enrollment', 'initial');
        this.updateProgressIndicator();
        this.updateSignatureGallery();
        this.updateEnrollmentStatus('Click "Start Camera" to begin enrollment process.', 'info');
    }

    updateProgressIndicator() {
        const progressFill = document.querySelector('.progress-fill');
        const signatureCountElement = document.getElementById('signature-count');

        const progress = (this.signatureCount / 5) * 100;

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        if (signatureCountElement) {
            signatureCountElement.textContent = this.signatureCount;
        }
    }

    updateSignatureGallery() {
        const gallery = document.getElementById('signature-gallery');
        if (!gallery) return;

        gallery.innerHTML = '';

        // Create 5 thumbnail slots
        for (let i = 0; i < 5; i++) {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'signature-thumbnail';

            if (i < this.signatureCount) {
                thumbnail.classList.add('recorded');
                thumbnail.innerHTML = `<i class="fas fa-check"></i><br>Signature ${i + 1}`;
            } else {
                thumbnail.innerHTML = `<i class="fas fa-plus"></i><br>Record ${i + 1}`;
            }

            gallery.appendChild(thumbnail);
        }
    }

    updateEnrollmentStatus(message, type = 'info') {
        const statusElement = document.getElementById('enrollment-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
        }
    }

    // ==========================================================================
    // Authentication Testing
    // ==========================================================================

    async authenticateGesture() {
        if (!this.currentUser || !this.currentUser.enrollmentComplete) {
            this.showNotification('Please complete enrollment first!', 'error');
            this.showPage('enrollment');
            return;
        }

        if (!this.webcamStream) {
            this.showNotification('Please start the camera first!', 'error');
            return;
        }

        console.log('🔐 Starting gesture authentication...');

        // Show loading state
        this.showAuthResult('processing', 'Processing...', 'Analyzing your gesture...');

        // Simulate gesture recognition process
        try {
            await this.simulateGestureRecognition();
        } catch (error) {
            console.error('Authentication error:', error);
            this.showAuthResult('error', 'Authentication Failed', 'An error occurred during authentication.');
            this.addAuthHistory('Air Signature', false, 'System error');
        }
    }

    async simulateGestureRecognition() {
        // Simulate processing time
        await this.delay(3000);

        // Simulate recognition result (90% success rate for demo)
        const isAuthenticated = Math.random() > 0.1;
        const confidence = isAuthenticated ? 
            Math.round(85 + Math.random() * 10) : // 85-95% confidence for success
            Math.round(30 + Math.random() * 40);   // 30-70% confidence for failure

        if (isAuthenticated) {
            this.showAuthResult('success', 'Authentication Successful!', 
                `Gesture recognized with ${confidence}% confidence. Welcome, ${this.currentUser.username}!`);
            this.addAuthHistory('Air Signature', true, `${confidence}% confidence`);
            this.showNotification('🎉 Authentication successful!', 'success');
        } else {
            this.showAuthResult('error', 'Authentication Failed', 
                `Gesture not recognized (${confidence}% confidence). Please try again.`);
            this.addAuthHistory('Air Signature', false, `Low confidence (${confidence}%)`);
            this.showNotification('❌ Authentication failed. Please try again.', 'error');
        }
    }

    showAuthResult(type, message, details) {
        const resultCard = document.getElementById('auth-result');
        const resultIcon = resultCard.querySelector('.result-icon');
        const resultMessage = resultCard.querySelector('.result-message');
        const resultDetails = resultCard.querySelector('.result-details');

        if (resultCard) {
            resultCard.className = `result-card ${type}`;
            resultCard.classList.remove('hidden');
        }

        if (resultIcon) {
            resultIcon.className = `result-icon ${type}`;
        }

        if (resultMessage) {
            resultMessage.textContent = message;
            resultMessage.className = `result-message ${type}`;
        }

        if (resultDetails) {
            resultDetails.textContent = details;
        }
    }

    resetAuthTest() {
        console.log('🔄 Resetting authentication test...');

        this.stopCamera();
        this.updateControlStates('auth', 'initial');

        const resultCard = document.getElementById('auth-result');
        if (resultCard) {
            resultCard.classList.add('hidden');
        }
    }

    // ==========================================================================
    // Dashboard Management
    // ==========================================================================

    updateDashboard() {
        if (!this.currentUser) {
            this.showNotification('Please log in to access dashboard', 'error');
            this.showPage('login');
            return;
        }

        console.log('📊 Updating dashboard...');

        // Update profile information
        this.updateProfileInfo();

        // Update statistics
        this.updateAuthStats();

        // Update history table
        this.updateAuthHistoryTable();
    }

    updateProfileInfo() {
        const usernameElement = document.getElementById('profile-username');
        const emailElement = document.getElementById('profile-email');
        const enrollmentElement = document.getElementById('profile-enrollment');
        const signaturesElement = document.getElementById('profile-signatures');

        if (usernameElement) usernameElement.textContent = this.currentUser.username;
        if (emailElement) emailElement.textContent = this.currentUser.email;

        if (enrollmentElement) {
            enrollmentElement.textContent = this.currentUser.enrollmentComplete ? 'Enrolled' : 'Not Enrolled';
            enrollmentElement.className = `status-badge ${this.currentUser.enrollmentComplete ? 'enrolled' : 'not-enrolled'}`;
        }

        if (signaturesElement) {
            signaturesElement.textContent = `${this.currentUser.signatures.length}/5`;
        }
    }

    updateAuthStats() {
        const totalAttempts = this.currentUser.authHistory.length;
        const successfulAuths = this.currentUser.authHistory.filter(entry => entry.success).length;
        const successRate = totalAttempts > 0 ? Math.round((successfulAuths / totalAttempts) * 100) : 0;

        const totalElement = document.getElementById('total-attempts');
        const successfulElement = document.getElementById('successful-auths');
        const rateElement = document.getElementById('success-rate');

        if (totalElement) totalElement.textContent = totalAttempts;
        if (successfulElement) successfulElement.textContent = successfulAuths;
        if (rateElement) rateElement.textContent = `${successRate}%`;
    }

    updateAuthHistoryTable() {
        const tbody = document.getElementById('auth-history-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const history = this.currentUser.authHistory.slice(-10).reverse(); // Show last 10, most recent first

        if (history.length === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.className = 'no-data';
            cell.textContent = 'No authentication history available';
            return;
        }

        history.forEach(entry => {
            const row = tbody.insertRow();

            // Date & Time
            const dateCell = row.insertCell();
            const date = new Date(entry.timestamp);
            dateCell.textContent = date.toLocaleString();

            // Method
            const methodCell = row.insertCell();
            methodCell.textContent = entry.method;

            // Result
            const resultCell = row.insertCell();
            resultCell.textContent = entry.success ? '✅ Success' : '❌ Failed';
            resultCell.style.color = entry.success ? '#10b981' : '#ef4444';

            // Details
            const detailsCell = row.insertCell();
            detailsCell.textContent = entry.details || '-';
        });
    }

    // ==========================================================================
    // Data Management
    // ==========================================================================

    loadUserData() {
        try {
            const savedUsers = localStorage.getItem('airauth_users');
            const savedCurrentUser = localStorage.getItem('airauth_current_user');
            const savedAuthStatus = localStorage.getItem('airauth_authenticated');

            if (savedUsers) {
                const usersData = JSON.parse(savedUsers);
                this.users = new Map(usersData);
                console.log(`💾 Loaded ${this.users.size} users from storage`);
            }

            if (savedCurrentUser && savedAuthStatus === 'true') {
                const userData = JSON.parse(savedCurrentUser);
                this.currentUser = userData;
                this.isAuthenticated = true;
                console.log(`👤 Restored session for: ${userData.username}`);
            }

        } catch (error) {
            console.error('Failed to load user data:', error);
            this.users = new Map();
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    saveUserData() {
        try {
            // Save users map
            const usersArray = Array.from(this.users.entries());
            localStorage.setItem('airauth_users', JSON.stringify(usersArray));

            // Save current user and auth status
            if (this.currentUser && this.isAuthenticated) {
                localStorage.setItem('airauth_current_user', JSON.stringify(this.currentUser));
                localStorage.setItem('airauth_authenticated', 'true');
            } else {
                localStorage.removeItem('airauth_current_user');
                localStorage.removeItem('airauth_authenticated');
            }

            console.log('💾 User data saved successfully');
        } catch (error) {
            console.error('Failed to save user data:', error);
        }
    }

    addAuthHistory(method, success, details) {
        if (!this.currentUser) return;

        const authEntry = {
            timestamp: new Date().toISOString(),
            method: method,
            success: success,
            details: details
        };

        this.currentUser.authHistory.push(authEntry);
        this.saveUserData();

        console.log(`📝 Auth history added: ${method} - ${success ? 'Success' : 'Failed'}`);
    }

    checkAuthStatus() {
        const savedAuthStatus = localStorage.getItem('airauth_authenticated');
        if (savedAuthStatus === 'true' && this.currentUser) {
            this.updateAuthStatus();
        }
    }

    updateAuthStatus() {
        // Update navigation based on auth status
        this.updateNavigation(this.currentPage);

        // Update any auth-dependent UI elements
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(element => {
            element.style.display = this.isAuthenticated ? 'block' : 'none';
        });
    }

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info', duration = 5000) {
        console.log(`🔔 Notification: ${message} (${type})`);

        const notification = document.getElementById('notification');
        const messageElement = notification.querySelector('.notification-message');
        const content = notification.querySelector('.notification-content');

        if (messageElement) messageElement.textContent = message;
        if (content) {
            content.className = `notification-content ${type}`;
        }

        notification.classList.remove('hidden');
        notification.classList.add('show');

        // Auto-hide notification
        setTimeout(() => {
            this.hideNotification();
        }, duration);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }

    handleKeyboard(e) {
        // Escape key to close modals/notifications
        if (e.key === 'Escape') {
            this.hideNotification();
            this.hideHelp();
        }

        // Space bar to stop recording (when recording)
        if (e.key === ' ' && this.isRecording) {
            e.preventDefault();
            this.stopRecording();
        }
    }

    logout() {
        console.log('👋 Logging out...');

        this.stopCamera();
        this.currentUser = null;
        this.isAuthenticated = false;
        this.signatureCount = 0;

        localStorage.removeItem('airauth_current_user');
        localStorage.removeItem('airauth_authenticated');

        this.showNotification('Logged out successfully', 'info');
        this.showPage('home');
    }
}

// =============================================================================
// Global Functions (for onclick handlers)
// =============================================================================

function showHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
}

function hideHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function logout() {
    if (window.airAuthApp) {
        window.airAuthApp.logout();
    }
}

// =============================================================================
// Application Bootstrap
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AirAuth Application Starting...');

    // Initialize the application
    window.airAuthApp = new AirAuthApp();

    // Handle browser navigation
    window.addEventListener('popstate', function(e) {
        const hash = window.location.hash.substr(1);
        if (hash && window.airAuthApp) {
            window.airAuthApp.showPage(hash);
        }
    });

    // Handle initial hash
    const initialHash = window.location.hash.substr(1);
    if (initialHash && window.airAuthApp) {
        setTimeout(() => {
            window.airAuthApp.showPage(initialHash);
        }, 100);
    }

    console.log('✅ AirAuth Application Initialized Successfully!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden && window.airAuthApp) {
        // Stop camera when page becomes hidden
        window.airAuthApp.stopCamera();
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (window.airAuthApp) {
        window.airAuthApp.stopCamera();
    }
});