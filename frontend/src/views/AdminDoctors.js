const AdminDoctors = {
    template: `
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-person-badge text-primary"></i> Manage Doctors</h2>
            <button class="btn btn-primary" @click="showAddModal = true">
                <i class="bi bi-plus-circle"></i> Add Doctor
            </button>
        </div>

        <div class="card shadow mb-4">
            <div class="card-body">
                <div class="row g-2">
                    <div class="col-md-6">
                        <input type="text" class="form-control"
                            placeholder="Search by name..."
                            v-model="search"
                            @input="loadDoctors">
                    </div>
                    <div class="col-md-4">
                        <input type="text" class="form-control"
                            placeholder="Filter by specialization..."
                            v-model="specFilter"
                            @input="loadDoctors">
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
                        <th>ID</th><th>Name</th><th>Specialization</th><th>Department</th>
                        <th>Phone</th><th>Fee</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="doc in doctors" :key="doc.id">
                        <td>{{ doc.id }}</td>
                        <td>{{ doc.name }}</td>
                        <td>{{ doc.specialization }}</td>
                        <td>{{ doc.department_name || 'N/A' }}</td>
                        <td>{{ doc.phone || 'N/A' }}</td>
                        <td>Rs. {{ doc.consultation_fee }}</td>
                        <td>
                            <span v-if="doc.is_active" class="badge bg-success">Active</span>
                            <span v-else class="badge bg-danger">Inactive</span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1" @click="editDoctor(doc)">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button v-if="doc.is_active" class="btn btn-sm btn-outline-danger" @click="deactivateDoctor(doc.id)">
                                <i class="bi bi-x-circle"></i>
                            </button>
                            <button v-else class="btn btn-sm btn-outline-success" @click="activateDoctor(doc.id)">
                                <i class="bi bi-check-circle"></i>
                            </button>
                        </td>
                    </tr>
                    <tr v-if="doctors.length === 0">
                        <td colspan="8" class="text-center text-muted py-4">No doctors found</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="modal fade"
             :class="{ show: showAddModal || showEditModal }"
             :style="(showAddModal || showEditModal) ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <span v-if="showEditModal">Edit Doctor</span>
                            <span v-else>Add New Doctor</span>
                        </h5>
                        <button type="button" class="btn-close" @click="closeModal"></button>
                    </div>

                    <form @submit.prevent="showEditModal ? updateDoctor() : addDoctor()">
                        <div class="modal-body">
                            <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" v-model="form.name" required>
                                </div>

                                <div class="col-md-6 mb-3" v-if="!showEditModal">
                                    <label class="form-label">Username *</label>
                                    <input type="text" class="form-control" v-model="form.username" required>
                                </div>
                                <div class="col-md-6 mb-3" v-if="!showEditModal">
                                    <label class="form-label">Email *</label>
                                    <input type="email" class="form-control" v-model="form.email" required>
                                </div>
                                <div class="col-md-6 mb-3" v-if="!showEditModal">
                                    <label class="form-label">Password *</label>
                                    <input type="password" class="form-control" v-model="form.password" required minlength="6">
                                </div>

                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Specialization *</label>
                                    <input type="text" class="form-control" v-model="form.specialization" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Department</label>
                                    <select class="form-select" v-model="form.department_id">
                                        <option :value="null">Select Department</option>
                                        <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" v-model="form.phone">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Qualification</label>
                                    <input type="text" class="form-control" v-model="form.qualification">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Experience (years)</label>
                                    <input type="number" class="form-control" v-model="form.experience_years" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Consultation Fee (Rs.)</label>
                                    <input type="number" class="form-control" v-model="form.consultation_fee" min="0" step="50">
                                </div>
                                <div class="col-12 mb-3">
                                    <label class="form-label">Bio</label>
                                    <textarea class="form-control" v-model="form.bio" rows="3"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
                            <button type="submit" class="btn btn-primary" :disabled="saving">
                                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                                <span v-if="showEditModal">Update</span>
                                <span v-else>Add Doctor</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div v-if="showAddModal || showEditModal" class="modal-backdrop fade show"></div>
    </div>
    `,

    data() {
        return {
            doctors: [],

            departments: [],

            loading: true,

            saving: false,

            search: '',

            specFilter: '',

            showAddModal: false,
            showEditModal: false,

            modalError: '',

            editingId: null,

            form: {
                name: '',
                username: '',
                email: '',
                password: '',
                specialization: '',
                department_id: null,
                phone: '',
                qualification: '',
                experience_years: 0,
                consultation_fee: 0,
                bio: ''
            }
        };
    },

    async mounted() {
        await this.loadDoctors();
        await this.loadDepartments();
    },

    methods: {
        async loadDoctors() {
            this.loading = true;
            try {
                var url = '/api/admin/doctors?';
                if (this.search) {
                    url = url + 'search=' + encodeURIComponent(this.search) + '&';
                }
                if (this.specFilter) {
                    url = url + 'specialization=' + encodeURIComponent(this.specFilter) + '&';
                }

                var res = await Store.apiCall(url);
                if (res.ok) {
                    this.doctors = await res.json();
                }
            } catch (e) {
                console.error('Failed to load doctors:', e);
            }
            this.loading = false;
        },

        async loadDepartments() {
            try {
                var res = await Store.apiCall('/api/admin/departments');
                if (res.ok) {
                    this.departments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load departments:', e);
            }
        },

        closeModal() {
            this.showAddModal = false;
            this.showEditModal = false;
            this.modalError = '';
            this.editingId = null;
            this.form = {
                name: '', username: '', email: '', password: '',
                specialization: '', department_id: null,
                phone: '', qualification: '', experience_years: 0,
                consultation_fee: 0, bio: ''
            };
        },

        editDoctor: function(doc) {
            this.editingId = doc.id;
            this.form.name = doc.name;
            this.form.specialization = doc.specialization;
            this.form.department_id = doc.department_id;
            this.form.phone = doc.phone || '';
            this.form.qualification = doc.qualification || '';
            this.form.experience_years = doc.experience_years || 0;
            this.form.consultation_fee = doc.consultation_fee || 0;
            this.form.bio = doc.bio || '';
            this.showEditModal = true;
        },

        async addDoctor() {
            this.saving = true;
            this.modalError = '';
            try {
                var res = await Store.apiCall('/api/admin/doctors', {
                    method: 'POST',
                    body: JSON.stringify(this.form)
                });
                var data = await res.json();
                if (res.ok) {
                    this.closeModal();
                    await this.loadDoctors();
                } else {
                    this.modalError = data.error || 'Failed to create doctor';
                }
            } catch (e) {
                this.modalError = 'Network error';
            }
            this.saving = false;
        },

        async updateDoctor() {
            this.saving = true;
            this.modalError = '';
            try {
                var res = await Store.apiCall('/api/admin/doctors/' + this.editingId, {
                    method: 'PUT',
                    body: JSON.stringify(this.form)
                });
                var data = await res.json();
                if (res.ok) {
                    this.closeModal();
                    await this.loadDoctors();
                } else {
                    this.modalError = data.error || 'Failed to update doctor';
                }
            } catch (e) {
                this.modalError = 'Network error';
            }
            this.saving = false;
        },

        async deactivateDoctor(id) {
            var confirmed = confirm('Deactivate this doctor?');
            if (!confirmed) {
                return;
            }
            await Store.apiCall('/api/admin/doctors/' + id, { method: 'DELETE' });
            await this.loadDoctors();
        },

        async activateDoctor(id) {
            await Store.apiCall('/api/admin/doctors/' + id + '/activate', { method: 'PUT' });
            await this.loadDoctors();
        }
    }
};
