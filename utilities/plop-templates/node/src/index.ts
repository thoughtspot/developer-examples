import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/', function (req, res) {
    console.log(req.body.name)
    res.end();
})

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on", `https://localhost:${PORT}`);
}); 