import app from './app/app.js'
import connectDb from './config/db.connect.js'
import config from './config/config.js'

connectDb()

const port = config.PORT

app.listen(port, (console.log(`server is running on http://localhost:${port}`)))