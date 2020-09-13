"use strict";

const { inspect } = require('util');
const fs = require('fs');
// var c = require('babel-types');

let varsInBlock = [];
let blocks = []; // {vars: [], code: ""}
const generateNewBlock = () => { return { vars: [], code: ""}; }

let isFromLet = false;
let isFromVar = false;

let nimOut = `
import \"../base.nim\"
`;

let indentation = 0;

const addLine = (l) => {
  const curBlock = blocks[blocks.length -1]; 
  curBlock.code += `\n${" ".repeat(indentation)}${l}`;
};
const addString = (l) => {
  const curBlock = blocks[blocks.length -1]; 
  curBlock.code += `${" ".repeat(indentation)}${l}`;
};


Object.defineProperty(exports, "__esModule", {
  value: true
});

console.log("Loaded the module");

var outputString = '';
exports.default = function({ types: t }) {
  return {
    name: 'js-to-nim',
    pre(state) {
      console.log("pre");
    },
    visitor: {
      Program: {
        enter(path, state) {
          console.log("Program enter");
          blocks.push(generateNewBlock());
        },
        exit(path, state) {
          console.log("Program exit");
          const curBlock = blocks.pop();
          curBlock.vars.forEach(v => {
            nimOut += `\nvar ${v} = newUndefined()`;
          });
          nimOut += `\n${curBlock.code}`;
        }
      },
      VariableDeclaration: {
        enter(path, state) {
          console.log(`VariableDeclaration Path.node is ${inspect(path.node)}`);
          isFromLet = path.node.kind === "let";
          isFromVar = path.node.kind === "var";

          if (isFromLet) {
            // addLine(`var `);
          } else {
            // Add the list of all variables being defined by this declaration so 
            // they can be added to the top of the block declaration adn set to undefined
            const curBlock = blocks[blocks.length - 1];
            curBlock.vars = curBlock.vars.concat(path.node.declarations.map(d => d.id.name));
          }
        },
        exit(path, state) {
          addString(`)`);
        }
      },
      AssignmentExpression: {
        enter(path, state) {
          console.log(`assignment operator:${path.node.operator}.`);
        },
        exit(path, state) {
        }
      },
      Identifier: {
        enter(path, state) {
          const name = path.node.name;

          const isFromAssignment = path.parent.type === 'AssignmentExpression';
          const isFromVariableDeclaration = path.parent.type === "VariableDeclarator";
          const isFromArgCall = path.parent.type === "CallExpression" && path.parent.arguments.some(a => a.start == path.node.start && a.end == path.node.end);

          if (isFromAssignment) {
            addLine(`${name} `);
          } else if (isFromVariableDeclaration){ 
            
            if (isFromVar) {
              addLine(`JS2NThis.setVar("${name}", `);
            }
            if (isFromLet) {
              addLine(`JS2NThis.setLet("${name}", `);
            }
            
          } else if (isFromArgCall){ 
            addString(` JS2NThis.getVar("${name}") `);
          }

          if (path.parent.type === 'VariableDeclarator') {
            if (path.parent.init === undefined) {
              addString(` newUndefined()`);
            }
          } else if (path.parent.type === 'AssignmentExpression') {
            addString(` ${path.parent.operator} `);
          }
        },
        exit(path, state) {
          // addString(`)`);
        }
      },
      NumericLiteral(path, state) {
        addString(`Obj(env: JS2Nthis.newEnv, objType: OTNumber, numValue: ${path.node.value})`);
      },
      StringLiteral: {
        enter(path, state) {
        //   console.log(`StringLiteral node: ${JSON.stringify(path.node)}`);
        //   console.log(`StringLiteral Parent: ${inspect(path.parent)}`);
          const isParentACallExpression = path.parent.type == 'CallExpression';
          let isLast = true;
          if (path.parent.arguments.length > 1) {
            const lastNode = path.parent.arguments[path.parent.arguments.length-1];
            isLast = (lastNode.start == path.node.start && lastNode.end == path.node.end);
          }
          addString(`Obj(env: JS2Nthis.env, objType: ObjType.OTString, strValue: "${path.node.value}")${isParentACallExpression && isLast ? '' : ','}`)
        },
        exit(path, state) {
        }
      },
      CallExpression: {
        enter(path, state) {
          console.log("Entered a CallExpression");
          if ('callee' in path.node) {
            const callee = path.node.callee;
            if (callee.type == 'Identifier') {
              addLine(`discard ${callee.name}(@[])`);
              path.skip();
            } else if (callee.type == 'MemberExpression') {
              addLine(`discard JS2Nthis.getVar("${callee.object.name}").getVar("${callee.property.name}").function(@[`);
            }
          }
        },
        exit(path, state) {
          addString(`])`);
        }
      },
      FunctionDeclaration: {
        enter(path, state) {
          addLine(`proc ${path.node.id.name}(args: seq[Obj]): Obj = `);
          indentation += 2;
          // addLine(`let JS2NOldThis = JS2NThis;`)
          // addLine(`let JS2NThis = Obj(env: JS2NOldThis.newEnv(), objType: ObjType.OTObject)`)
        },
        exit(path, state) {
          indentation -= 2;
          console.log("Exit FunctionDeclaration");
        }
      },
      BlockStatement: {
        enter(path, state) {
          console.log("Entered a BlockStatement");
          addLine(`let JS2NOldThis = JS2NThis;`)
          addLine(`let JS2NThis = Obj(env: JS2NOldThis.newEnv(), objType: ObjType.OTObject)`)
          blocks.push(generateNewBlock())
          
        },
        exit(path, state) {
          const poppedBlock = blocks.pop()
          const curBlock = blocks[blocks.length - 1];
          poppedBlock.vars.forEach(v => {
            addLine(`var ${v} = newUndefined()`);
          });
          addLine(poppedBlock.code);
          console.log("Exit BlockStatement"); 
        }
      },      
      FunctionExpression: {
        enter(path, state) {
          console.log("Entered a FunctionExpression");
        },
        exit(path, state) {
          console.log("Exit FunctionExpression");
        }
      },
    },
    post(state) {
      console.log("post");
      console.log(`\n\nWriting fileoutput: ${nimOut} \n\n`);
      fs.writeFileSync('out/out.nim', nimOut);
    }
  };
};
 
