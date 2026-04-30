function calculateTotal(items) {
    return items.reduce((acc, item) => acc + item.price, 0);
}

// BUG: items is not defined here
console.log(calculateTotal(undefined)); 
