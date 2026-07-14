const Login = {
    template: `
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-5">
                <div class="card shadow">
                    <div class="card-body p-4">
                        <h3 class="card-title text-center mb-4">
                            <i class="bi bi-hospital text-primary"></i><br>
                            Hospital Management System
                        </h3>
                        <h5 class="text-center text-muted mb-4">Login</h5>

                        <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                            {{ error }}
                            <button type="button" class="btn-close" @click="error=''"></button>
                        </div>

                        <form @submit.prevent="handleLogin">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-person"></i></span>
                                    <input type="text" class="form-control" v-model="username" required placeholder="Enter username">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                    <input type="password" class="form-control" v-model="password" required placeholder="Enter password">
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                                <span v-if="loading">Logging in...</span>
                                <span v-else>Login</span>
                            </button>
                        </form>

                        <div class="text-center mt-3">
                            <p class="text-muted">
                                Don't have an account?
                                <router-link to="/register" class="text-primary">Register here</router-link>
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
            username: '',

            password: '',

            error: '',

            loading: false
        };
    },

    methods: {
        async handleLogin() {
            this.loading = true;
            this.error = '';

            try {
                var res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password
                    })
                });

                var data = await res.json();

                if (res.ok) {
                    Store.login(data.user, data.access_token);

                    var role = data.user.role;
                    if (role === 'admin') {
                        this.$router.push('/admin/dashboard');
                    } else if (role === 'doctor') {
                        this.$router.push('/doctor/dashboard');
                    } else {
                        this.$router.push('/patient/dashboard');
                    }

                } else {
                    this.error = data.error || 'Login failed. Please check your credentials.';
                }

            } catch (e) {
                this.error = 'Network error. Please try again.';
            } finally {
                this.loading = false;
            }
        }
    }
};
