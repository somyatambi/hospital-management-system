const Navbar = {
    template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div class="container">

            <router-link class="navbar-brand fw-bold" to="/">
                <i class="bi bi-hospital"></i> HMS
            </router-link>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarNav">

                <ul class="navbar-nav me-auto" v-if="isAuthenticated">

                    <template v-if="userRole === 'admin'">
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/dashboard">
                                <i class="bi bi-speedometer2"></i> Dashboard
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/doctors">
                                <i class="bi bi-person-badge"></i> Doctors
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/patients">
                                <i class="bi bi-people"></i> Patients
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/appointments">
                                <i class="bi bi-calendar-check"></i> Appointments
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/departments">
                                <i class="bi bi-building"></i> Departments
                            </router-link>
                        </li>
                    </template>

                    <template v-if="userRole === 'doctor'">
                        <li class="nav-item">
                            <router-link class="nav-link" to="/doctor/dashboard">
                                <i class="bi bi-speedometer2"></i> Dashboard
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/doctor/appointments">
                                <i class="bi bi-calendar-check"></i> Appointments
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/doctor/availability">
                                <i class="bi bi-clock"></i> Availability
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/doctor/patients">
                                <i class="bi bi-people"></i> Patient History
                            </router-link>
                        </li>
                    </template>

                    <template v-if="userRole === 'patient'">
                        <li class="nav-item">
                            <router-link class="nav-link" to="/patient/dashboard">
                                <i class="bi bi-speedometer2"></i> Dashboard
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/patient/doctors">
                                <i class="bi bi-search"></i> Find Doctors
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/patient/appointments">
                                <i class="bi bi-calendar-check"></i> My Appointments
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/patient/treatments">
                                <i class="bi bi-file-medical"></i> Treatments
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/patient/profile">
                                <i class="bi bi-person-circle"></i> Profile
                            </router-link>
                        </li>
                    </template>
                </ul>

                <ul class="navbar-nav">

                    <template v-if="isAuthenticated">
                        <li class="nav-item">
                            <span class="nav-link text-light">
                                <i class="bi bi-person-circle"></i> {{ userName }}
                                <span class="badge bg-light text-primary ms-1">{{ userRole }}</span>
                            </span>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" @click.prevent="logout">
                                <i class="bi bi-box-arrow-right"></i> Logout
                            </a>
                        </li>
                    </template>

                    <template v-else>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/login">
                                <i class="bi bi-box-arrow-in-right"></i> Login
                            </router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/register">
                                <i class="bi bi-person-plus"></i> Register
                            </router-link>
                        </li>
                    </template>

                </ul>
            </div>
        </div>
    </nav>
    `,

    computed: {
        isAuthenticated: function() {
            return Store.state.isAuthenticated;
        },

        userRole: function() {
            if (Store.state.user) {
                return Store.state.user.role;
            }
            return null;
        },

        userName: function() {
            if (Store.state.user) {
                return Store.state.user.username;
            }
            return '';
        }
    },

    methods: {
        logout: function() {
            Store.logout();
            this.$router.push('/login');
        }
    }
};
