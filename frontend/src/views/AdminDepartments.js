const AdminDepartments = {
    template: `
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-building text-primary"></i> Manage Departments</h2>
            <button class="btn btn-primary" @click="showAddModal = true">
                <i class="bi bi-plus-circle"></i> Add Department
            </button>
        </div>

        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>

        <div class="row g-3" v-else>
            <div class="col-md-4" v-for="dept in departments" :key="dept.id">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h5 class="card-title">{{ dept.name }}</h5>
                        <p class="card-text text-muted">{{ dept.description || 'No description' }}</p>
                        <span class="badge bg-info">{{ dept.doctors_count }} Doctors</span>
                    </div>
                    <div class="card-footer bg-white">
                        <button class="btn btn-sm btn-outline-primary me-1" @click="editDept(dept)">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="deleteDept(dept.id)">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12" v-if="departments.length === 0">
                <div class="text-center text-muted py-4">No departments found</div>
            </div>
        </div>

        <div class="modal fade"
             :class="{ show: showAddModal || showEditModal }"
             :style="(showAddModal || showEditModal) ? 'display:block' : 'display:none'"
             tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <span v-if="showEditModal">Edit Department</span>
                            <span v-else>Add Department</span>
                        </h5>
                        <button type="button" class="btn-close" @click="closeModal"></button>
                    </div>

                    <form @submit.prevent="showEditModal ? updateDept() : addDept()">
                        <div class="modal-body">
                            <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

                            <div class="mb-3">
                                <label class="form-label">Department Name *</label>
                                <input type="text" class="form-control" v-model="form.name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea class="form-control" v-model="form.description" rows="3"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <span v-if="showEditModal">Update</span>
                                <span v-else>Add</span>
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
            departments: [],

            loading: true,

            showAddModal: false,
            showEditModal: false,

            modalError: '',

            editingId: null,

            form: { name: '', description: '' }
        };
    },

    async mounted() {
        await this.loadDepts();
    },

    methods: {
        async loadDepts() {
            this.loading = true;
            try {
                var res = await Store.apiCall('/api/admin/departments');
                if (res.ok) {
                    this.departments = await res.json();
                }
            } catch (e) {
                console.error('Failed to load departments:', e);
            }
            this.loading = false;
        },

        closeModal() {
            this.showAddModal = false;
            this.showEditModal = false;
            this.modalError = '';
            this.editingId = null;
            this.form = { name: '', description: '' };
        },

        editDept: function(dept) {
            this.editingId = dept.id;
            this.form.name = dept.name;
            this.form.description = dept.description || '';
            this.showEditModal = true;
        },

        async addDept() {
            this.modalError = '';
            try {
                var res = await Store.apiCall('/api/admin/departments', {
                    method: 'POST',
                    body: JSON.stringify(this.form)
                });
                var data = await res.json();
                if (res.ok) {
                    this.closeModal();
                    await this.loadDepts();
                } else {
                    this.modalError = data.error || 'Failed to create department';
                }
            } catch (e) {
                this.modalError = 'Network error';
            }
        },

        async updateDept() {
            this.modalError = '';
            try {
                var res = await Store.apiCall('/api/admin/departments/' + this.editingId, {
                    method: 'PUT',
                    body: JSON.stringify(this.form)
                });
                var data = await res.json();
                if (res.ok) {
                    this.closeModal();
                    await this.loadDepts();
                } else {
                    this.modalError = data.error || 'Failed to update department';
                }
            } catch (e) {
                this.modalError = 'Network error';
            }
        },

        async deleteDept(id) {
            var confirmed = confirm('Delete this department? This cannot be undone.');
            if (!confirmed) {
                return; // user clicked Cancel
            }
            await Store.apiCall('/api/admin/departments/' + id, { method: 'DELETE' });
            await this.loadDepts();
        }
    }
};
