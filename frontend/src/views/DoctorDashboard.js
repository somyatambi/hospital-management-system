const DoctorDashboard = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-speedometer2 text-primary"></i> Doctor Dashboard</h2>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <template v-else>
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-calendar-check fs-1"></i>
                            <h3>{{ data.total_appointments }}</h3>
                            <p class="mb-0">Total Appointments</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-check-circle fs-1"></i>
                            <h3>{{ data.completed_appointments }}</h3>
                            <p class="mb-0">Completed</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white shadow">
                        <div class="card-body text-center">
                            <i class="bi bi-people fs-1"></i>
                            <h3>{{ data.total_patients }}</h3>
                            <p class="mb-0">Total Patients</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-header bg-white">
                            <h5 class="mb-0"><i class="bi bi-calendar-day"></i> Today's Appointments</h5>
                        </div>
                        <div class="card-body">
                            <div v-if="data.todays_appointments && data.todays_appointments.length > 0">
                                <div class="list-group list-group-flush">
                                    <div v-for="a in data.todays_appointments" :key="a.id"
                                         class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>{{ a.patient_name }}</strong><br>
                                            <small class="text-muted">{{ a.time }} - {{ a.reason || 'No reason given' }}</small>
                                        </div>
                                        <span :class="statusBadge(a.status)">{{ a.status }}</span>
                                    </div>
                                </div>
                            </div>
                            <p v-else class="text-muted text-center py-3">No appointments today</p>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card shadow">
                        <div class="card-header bg-white">
                            <h5 class="mb-0"><i class="bi bi-calendar-week"></i> Upcoming (Next 7 Days)</h5>
                        </div>
                        <div class="card-body">
                            <div v-if="data.upcoming_appointments && data.upcoming_appointments.length > 0">
                                <div class="list-group list-group-flush">
                                    <div v-for="a in data.upcoming_appointments" :key="a.id" class="list-group-item">
                                        <div class="d-flex justify-content-between">
                                            <strong>{{ a.patient_name }}</strong>
                                            <small class="text-primary">{{ a.date }}</small>
                                        </div>
                                        <small class="text-muted">{{ a.time }} - {{ a.reason || 'No reason given' }}</small>
                                    </div>
                                </div>
                            </div>
                            <p v-else class="text-muted text-center py-3">No upcoming appointments</p>
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
            var res = await Store.apiCall('/api/doctor/dashboard');
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
            if (status === 'Booked') {
                return 'badge bg-primary';
            }
            if (status === 'Completed') {
                return 'badge bg-success';
            }
            return 'badge bg-danger';
        }
    }
};
