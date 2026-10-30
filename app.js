const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const Expense = require("./models/expense");
const User = require("./models/user");

const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcrypt");
require("dotenv").config();

app.set("trust proxy", 1);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
   store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
}),
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

//Authenticate the user
function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

const port = process.env.PORT || 3000;


app.set("view engine","ejs");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully!"))
    .catch((err) => console.log(err));

//Dashboard => Home page
app.get("/",isLoggedIn,async (req,res) =>{
    try{
    let category = req.query.category;
    let expense;
    if(category === undefined || category === "All"){
         expense = await Expense.find({user: req.session.userId});
    } else {
         expense = await Expense.find({category,user:req.session.userId});
    }
    let categoryTotals = expense.reduce((accumulator,currentItem) =>{
        accumulator[currentItem.category] =
        accumulator[currentItem.category] || 0;

        accumulator[currentItem.category] += currentItem.amount;
        return accumulator;
    },{})
  let totalExpense = expense.reduce((accumulator, currentItem) => {
    return accumulator + currentItem.amount;
}, 0);
   let totalTransactions = expense.length;
   let averageExpense;
   if(totalTransactions == 0){
     averageExpense = 0;
   } else {
    averageExpense = totalExpense/totalTransactions;
   }
   let monthlyExpense = expense.filter((item)=>{
        let currentMonth = new Date().getMonth();
        let currentYear = new Date().getFullYear();
    return (item.date.getMonth() === currentMonth && item.date.getFullYear() === currentYear);
   }).reduce((accumulator,currentItem) =>{
    return accumulator + currentItem.amount;
   },0);
    res.render("home.ejs",{expense,totalExpense,totalTransactions,monthlyExpense,category: category || "All",categoryTotals,averageExpense});
} catch (err) {
    console.log(err);
    return res.status(500).send("Something went wrong.");
}
});
//New Route
app.get("/expenses/new",isLoggedIn,(req, res) => {
    res.render("expenses/new.ejs", {
    errors: [],
    formData: {}
});
});

//Submit Route

app.post("/expenses", isLoggedIn, async (req, res) => {
    try {
        let { expense } = req.body;

        await Expense.create({
            ...expense,
            user: req.session.userId
        });

        res.redirect("/");
    } catch (err) {
        console.log(err);

        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map(
                error => error.message
            );

            return res.status(400).send(errors.join(", "));
        }

        return res.status(500).send("Something went wrong.");
    }
});


//Delete Route
app.delete("/expenses/:id",isLoggedIn,async (req,res) =>{
    try{
    let {id} = req.params;
    await Expense.findOneAndDelete({
        _id: id,
        user: req.session.userId
    });
    res.redirect("/");
} catch (err) {
    console.log(err);
    return res.status(500).send("Something went wrong.");
}
});

//Get the edit Route
app.get("/expenses/:id/edit",isLoggedIn, async (req,res) =>{
    try{
    let {id} = req.params;
    let editExpenses = await Expense.findOne({
        _id: id,
         user: req.session.userId
    });
      if (!editExpenses) {
        return res.status(404).send("Expense not found");
    }
    res.render("expenses/edit.ejs", { editExpenses });
 } catch (err) {
    console.log(err);
    return res.status(500).send("Something went wrong.");
}
});
//Edit
app.patch("/expenses/:id",isLoggedIn,async(req,res) =>{
    try{
     let {id} = req.params;
   let updatedExpense = await Expense.findOneAndUpdate({_id: id,user: req.session.userId}, req.body.expense, {
    runValidators: true,new: true
});
if (!updatedExpense) {
    return res.status(404).send("Expense not found");
}
    res.redirect("/");
    } catch (err) {
    console.log(err);

    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(
            error => error.message
        );

        return res.status(400).send(errors.join(", "));
    }

    return res.status(500).send("Something went wrong.");
}
});

//Signup
app.get("/signup",(req,res) =>{
    res.render("users/signup.ejs");
});

app.post("/signup",async(req,res) =>{
    try {
       let { username, email, password } = req.body;

if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !email.trim() ||
    !password
) {
    return res.status(400).render("users/signup.ejs", {
        error: "All fields are required."
    });
}

username = username.trim();
email = email.trim().toLowerCase();
        if (password.length < 8) {
    return res.status(400).render("users/signup.ejs", {
        error: "Password must be at least 8 characters long."
    });
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(email)) {
    return res.status(400).render("users/signup.ejs", {
        error: "Please enter a valid email address."
    });
}

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username: username,
            email: email,
            password: hashedPassword
        });

        res.redirect("/login");
    } catch (err) {
        if (err.code === 11000) {
     return res.status(409).render("users/signup.ejs", {
    error: "This email is already registered. Please login."
});
}
        console.log(err);
        res.status(500).send("Signup failed. Please try again.");
    }
});

//Login
app.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

app.post("/login",async (req,res) =>{
    try{
  let {email,password} = req.body;
  email = email.trim().toLowerCase();
  let user = await User.findOne({ email });
  if(!user){
  return res.status(401).render("users/login.ejs", {
    error: "Invalid email or password. Please try again."
});
  }
  let isMatch = await bcrypt.compare(password,user.password);
  if (isMatch) {
    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).send("Unable to create session");
        }

        req.session.userId = user._id;

        req.session.save((err) => {
            if (err) {
                return res.status(500).send("Unable to save session");
            }

            res.redirect("/");
        });
    });
} else {
  return res.status(401).render("users/login.ejs", {
    error: "Invalid email or password. Please try again."
});
  }
} catch (err) {
    console.log(err);
    return res.status(500).send("Something went wrong.");
}
});

//logout
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Unable to logout");
        }

        res.redirect("/login");
    });
});


app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
});
