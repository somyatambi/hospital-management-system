const AdminPatients = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-people text-primary"></i> Manage Patients</h2>

        <div class="card shadow mb-4">
            <div class="card-body">
                <input type="text" class="form-control"
                    placeholder="Search by name, phone..."
                    v-model="search"
                    @input="loadPatients">
            </div>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div class="table-responsive" v-else>
            <table class="table table-hover shadow-sm">
                <thead class="table-primary">
                    <tr>
                        <th>ID</th><th>Name</th><th>Email</th><th>Phone</th>
                        <th>Gender</th><th>Blood Group</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="p in patients" :key="p.id">
                        <td>{{ p.id }}</td>
                        <td>{{ p.name }}</td>
                        <td>{{ p.email }}</td>
                        <td>{{ p.phone || 'N/A' }}</td>
                        <td>{{ p.gender || 'N/A' }}</td>
                        <td>{{ p.blood_group || 'N/A' }}</td>
                        <td>
                            <span v-if="p.is_active" class="badge bg-success">Active</span>
                            <span v-else class="badge bg-danger">Inactive</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-info me-1" @click="viewPatient(p.id)">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button v-if="p.is_active" class="btn btn-sm btn-outline-danger" @click="deactivatePatient(p.id)">
                                <i class="bi bi-x-circle"></i>
                            </button>
                            <button v-else class="btn btn-sm btn-outline-success" @click="activatePatient(p.id)">
                                <i class="bi bi-check-circle"></i>
                            </button>
                        </td>
                    </tr>
                    <tr v-if="patients.length === 0">
                        <td colspan="8" class="text-center text-muted py-4">No patients found</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="modal fade"
             :class="{ show: showDetailModal }"
             :style="showDetailModal ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Patient Details</h5>
                        <button type="button" class="btn-close" @click="showDetailModal = false"></button>
                    </div>

                    <div class="modal-body" v-if="selectedPatient">
                        <div class="row mb-3">
                            <div class="col-md-6"><strong>Name:</strong> {{ selectedPatient.name }}</div>
                            <div class="col-md-6"><strong>Email:</strong> {{ selectedPatient.email }}</div>
                            <div class="col-md-6"><strong>Phone:</strong> {{ selectedPatient.phone || 'N/A' }}</div>
                            <div class="col-md-6"><strong>Gender:</strong> {{ selectedPatient.gender || 'N/A' }}</div>
                            <div class="col-md-6"><strong>Blood Group:</strong> {{ selectedPatient.blood_group || 'N/A' }}</div>
                            <div class="col-md-6"><strong>Date of Birth:</strong> {{ selectedPatient.date_of_birth || 'N/A' }}</div>
                            <div class="col-12 mt-2"><strong>Address:</strong> {{ selectedPatient.address || 'N/A' }}</div>
                        </div>

                        <h6>Appointment History</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr><th>Date</th><th>Time</th><th>Doctor</th><th>Status</th><th>Diagnosis</th></tr>
                                </thead>
                                <tbody>
                                    <tr v-for="a in selectedPatient.appointments" :key="a.id">
                                        <td>{{ a.date }}</td>
                                        <td>{{ a.time }}</td>
                                        <td>Dr. {{ a.doctor_name }}</td>
                                        <td>{{ a.status }}</td>
                                        <td>{{ a.treatment ? a.treatment.diagnosis : 'N/A' }}</td>
                                    </tr>
                                    <tr v-if="!selectedPatient.appointments || selectedPatient.appointments.length === 0">
                                        <td colspan="5" class="text-center text-muted">No appointments yet</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showDetailModal" class="modal-backdrop fade show"></div>
    </div>
    `,

    data() {
        return {
            patients: [],

            loading: true,

            search: '',

            showDetailModal: false,

            selectedPatient: null
        };
    },

    async mounted() {
        await this.loadPatients();
    },

    methods: {
        async loadPatients() {
            this.loading = true;
            try {
                var url = '/api/admin/patients';
                if (this.search) {
                    url = url + '?search=' + encodeURIComponent(this.search);
                }
                var res = await Store.apiCall(url);
                if (res.ok) {
                    this.patients = await res.json();
                }
            } catch (e) {
                console.error('Failed to load patients:', e);
            }
            this.loading = false;
        },

        async viewPatient(id) {
            try {
                var res = await Store.apiCall('/api/admin/patients/' + id);
                if (res.ok) {
                    this.selectedPatient = await res.json();
                    this.showDetailModal = true;
                }
            } catch (e) {
                console.error('Failed to load patient details:', e);
            }
        },

        async deactivatePatient(id) {
            var confirmed = confirm('Deactivate this patient account?');
            if (!confirmed) {
                return;
            }
            await Store.apiCall('/api/admin/patients/' + id + '/deactivate', { method: 'PUT' });
            await this.loadPatients();
        },

        async activatePatient(id) {
            await Store.apiCall('/api/admin/patients/' + id + '/activate', { method: 'PUT' });
            await this.loadPatients();
        }
    }
};
