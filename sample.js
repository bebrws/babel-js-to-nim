var x = 3;
var y = 1;
x = 2;

console.log("hey", "there")

function ftest() {
    var newx = 4
    x = 1;
    console.log("newx:", newx)
    console.log("x:", x)
}

ftest()

function ytest() {
    console.log("y is: ", y)
}

ytest()