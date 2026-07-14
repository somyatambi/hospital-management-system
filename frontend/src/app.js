const App = {
    template: `
    <div id="app-root">
        <Navbar />

        <router-view></router-view>
    </div>
    `,

    components: { Navbar }
};

const app = Vue.createApp(App);

app.use(router);

app.mount('#app');
