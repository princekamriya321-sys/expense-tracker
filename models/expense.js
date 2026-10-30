const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },

    amount: {
        type: Number,
        required: true,
        min: [0.01, "Amount must be greater than zero"]
    },

    category: {
        type: String,
        required: true,
        trim: true,
        enum: ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Other"]
    },

    date: {
        type: Date,
        required: true,
        validate: {
           validator: function(value) {
    const expenseDate = value.toISOString().slice(0, 10);

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata"
    }).format(new Date());

    return expenseDate <= today;
},
            message: "Expense date cannot be in the future."
        }
    },

    notes: {
        type: String,
        trim: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;