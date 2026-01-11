module.exports = {
    apps: [{
        name: "cafe-dashboard",
        script: "npm",
        args: "start",
        cwd: "./",
        env: {
            NODE_ENV: "production",
            PORT: 3050
        },
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G'
    }]
}
