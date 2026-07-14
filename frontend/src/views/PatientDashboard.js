const PatientDashboard = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-speedometer2 text-primary"></i> Patient Dashboard</h2>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <template v-else>
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-calendar-check fs-1"></i>
                            <h3>{{ data.upcoming_appointments ? data.upcoming_appointments.length : 0 }}</h3>
                            <p class="mb-0">Upcoming Appointments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-building fs-1"></i>
                            <h3>{{ data.departments ? data.departments.length : 0 }}</h3>
                            <p class="mb-0">Departments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-person-badge fs-1"></i>
                            <h3>{{ data.available_doctors ? data.available_doctors.length : 0 }}</h3>
                            <p class="mb-0">Available Doctors</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-calendar-event"></i> Upcoming Appointments</h5>
                            <router-link to="/patient/appointments" class="btn btn-sm btn-outline-primary">View All</router-link>
                        </div>
                        <div class="card-body">
                            <div v-if="data.upcoming_appointments && data.upcoming_appointments.length > 0"
                                 class="list-group list-group-flush">
                                <div v-for="a in data.upcoming_appointments" :key="a.id" class="list-group-item">
                                    <div class="d-flex justify-content-between">
                                        <strong>Dr. {{ a.doctor_name }}</strong>
                                        <small class="text-primary">{{ a.date }}</small>
                                    </div>
                                    <small class="text-muted">{{ a.time }} | {{ a.doctor_specialization }}</small>
                                </div>
                            </div>
                            <p v-else class="text-muted text-center py-3">No upcoming appointments</p>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-header bg-white">
                            <h5 class="mb-0"><i class="bi bi-building"></i> Departments</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-2">
                                <div class="col-6" v-for="dept in data.departments" :key="dept.id">
                                    <router-link :to="'/patient/doctors?department_id=' + dept.id" class="text-decoration-none">
                                        <div class="card bg-light h-100">
                                            <div class="card-body py-2 px-3 text-center">
                                                <i class="bi bi-hospital text-primary"></i>
                                                <small class="d-block">{{ dept.name }}</small>
                                                <small class="text-muted">{{ dept.doctors_count }} doctors</small>
                                            </div>
                                        </div>
                                    </router-link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header bg-white">
                            <h5 class="mb-0"><i class="bi bi-clock-history"></i> Recent Appointment History</h5>
                        </div>
                        <div class="card-body">
                            <div v-if="data.past_appointments && data.past_appointments.length > 0"
                                 class="table-responsive">
                                <table class="table table-sm table-hover">
                                    <thead>
                                        <tr><th>Date</th><th>Doctor</th><th>Status</th><th>Diagnosis</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="a in data.past_appointments" :key="a.id">
                                            <td>{{ a.date }}</td>
                                            <td>Dr. {{ a.doctor_name }}</td>
                                            <td>
                                                <span :class="statusBadge(a.status)">{{ a.status }}</span>
                                            </td>
                                            <td>{{ a.treatment ? a.treatment.diagnosis : 'N/A' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p v-else class="text-muted text-center py-3">No past appointments</p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
    `,

    data() {
        return {
            data: {},

            loading: true
        };
    },

    async mounted() {
        try {
            var res = await Store.apiCall('/api/patient/dashboard');
            if (res.ok) {
                this.data = await res.json();
            }
        } catch (e) {
            console.error('Failed to load dashboard:', e);
        }
        this.loading = false;
    },

    methods: {
        statusBadge: function(status) {
            if (status === 'Booked') { return 'badge bg-primary'; }
            if (status === 'Completed') { return 'badge bg-success'; }
            return 'badge bg-danger';
        }
    }
};
