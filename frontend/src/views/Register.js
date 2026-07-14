const Register = {
    template: `
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-body p-4">
                        <h3 class="card-title text-center mb-4">
                            <i class="bi bi-person-plus text-primary"></i><br>
                            Patient Registration
                        </h3>

                        <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                            {{ error }}
                            <button type="button" class="btn-close" @click="error=''"></button>
                        </div>
                        <div v-if="success" class="alert alert-success">{{ success }}</div>

                        <form @submit.prevent="handleRegister">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" v-model="form.name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Username *</label>
                                    <input type="text" class="form-control" v-model="form.username" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email *</label>
                                <input type="email" class="form-control" v-model="form.email" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password *</label>
                                <input type="password" class="form-control" v-model="form.password" required minlength="6">
                                <small class="text-muted">Minimum 6 characters</small>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" v-model="form.phone">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Gender</label>
                                    <select class="form-select" v-model="form.gender">
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" class="form-control" v-model="form.date_of_birth">
                            </div>

                            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                                <span v-if="loading">Registering...</span>
                                <span v-else>Register</span>
                            </button>
                        </form>

                        <div class="text-center mt-3">
                            <p class="text-muted">
                                Already have an account?
                                <router-link to="/login" class="text-primary">Login here</router-link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            form: {
                name: '',
                username: '',
                email: '',
                password: '',
                phone: '',
                gender: '',
                date_of_birth: ''
            },

            error: '',

            success: '',

            loading: false
        };
    },

    methods: {
        async handleRegister() {
            this.loading = true;
            this.error = '';
            this.success = '';

            try {
                var res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                var data = await res.json();

                if (res.ok) {
                    Store.login(data.user, data.access_token);
                    this.$router.push('/patient/dashboard');

                } else {
                    this.error = data.error || 'Registration failed. Please try again.';
                }

            } catch (e) {
                this.error = 'Network error. Please try again.';

            } finally {
                this.loading = false;
            }
        }
    }
};
