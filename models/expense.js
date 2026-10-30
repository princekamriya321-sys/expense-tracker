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
        required : true,
        min: [0.01, "Amount must be greater than zero"]
    },
    category: {
        type: String,
        required: true,
          trim: true,
    enum: ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"]
    },
    date: {
        type: Date,
        required: true,
        validate: {
        validator: function(value) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return value <= today;
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
      },
},
)

const Expense = mongoose.model("Expense",expenseSchema);
module.exports = Expense;