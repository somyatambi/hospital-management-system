const AdminAppointments = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-calendar-check text-primary"></i> All Appointments</h2>

        <div class="card shadow mb-4">
            <div class="card-body">
                <div class="row g-2">
                    <div class="col-md-4">
                        <select class="form-select" v-model="statusFilter" @change="loadAppointments">
                            <option value="">All Status</option>
                            <option value="Booked">Booked</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div class="table-responsive" v-else>
            <table class="table table-hover shadow-sm">
                <thead class="table-primary">
                    <tr>
                        <th>ID</th><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th>
                        <th>Specialization</th><th>Status</th><th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="a in appointments" :key="a.id">
                        <td>{{ a.id }}</td>
                        <td>{{ a.date }}</td>
                        <td>{{ a.time }}</td>
                        <td>{{ a.patient_name }}</td>
                        <td>Dr. {{ a.doctor_name }}</td>
                        <td>{{ a.doctor_specialization }}</td>
                        <td>
                            <span :class="statusBadge(a.status)">{{ a.status }}</span>
                        </td>
                        <td>{{ a.reason || 'N/A' }}</td>
                    </tr>
                    <tr v-if="appointments.length === 0">
                        <td colspan="8" class="text-center text-muted py-4">No appointments found</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,

    data() {
        return {
            appointments: [],

            loading: true,

            statusFilter: ''
        };
    },

    async mounted() {
        await this.loadAppointments();
    },

    methods: {
        async loadAppointments() {
            this.loading = true;
            try {
                var url = '/api/admin/appointments';
                if (this.statusFilter) {
                    url = url + '?status=' + this.statusFilter;
                }

                var res = await Store.apiCall(url);
                if (res.ok) {
                    this.appointments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load appointments:', e);
            }
            this.loading = false;
        },

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
