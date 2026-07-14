const Store = {

    state: Vue.reactive({
        user: JSON.parse(localStorage.getItem('user') || 'null'),

        token: localStorage.getItem('token') || null,

        isAuthenticated: !!localStorage.getItem('token'),
    }),

    login: function(user, token) {
        this.state.user = user;
        this.state.token = token;
        this.state.isAuthenticated = true;

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
    },

    logout: function() {
        this.state.user = null;
        this.state.token = null;
        this.state.isAuthenticated = false;

        localStorage.removeItem('user');
        localStorage.removeItem('token');
    },

    getAuthHeaders: function() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.state.token
        };
    },

    apiCall: async function(url, options) {
        if (!options) {
            options = {};
        }

        var defaultHeaders = {};
        if (this.state.token) {
            defaultHeaders = this.getAuthHeaders();
        } else {
            defaultHeaders = { 'Content-Type': 'application/json' };
        }

        var mergedHeaders = {};
        for (var key in defaultHeaders) {
            mergedHeaders[key] = defaultHeaders[key];
        }
        if (options.headers) {
            for (var hkey in options.headers) {
                mergedHeaders[hkey] = options.headers[hkey];
            }
        }

        var response = await fetch(url, Object.assign({}, options, { headers: mergedHeaders }));

        if (response.status === 401) {
            this.logout();
            window.location.hash = '#/login';
            throw new Error('Session expired. Please log in again.');
        }

        return response;
    }
};
