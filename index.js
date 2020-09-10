"use strict";

const { inspect } = require('util');
var fs = require('fs');
// var c = require('babel-types');

let nimOut = `
import \"../base.nim\"
`;

let indentation = 0;

const addLine = (l) => nimOut = nimOut.concat(`\n${" ".repeat(indentation)}${l}`);
const addString = (l) => nimOut = nimOut.concat(`${l}`);


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
        },
        exit(path, state) {
          console.log("Program exit");
        }
      },
      VariableDeclaration: {
        enter(path, state) {
          console.log(`VariableDeclaration Path.node is ${inspect(path.node)}`);
          if (path.node.declarations) {
            addLine(`var `);
          }   
        },
        exit(path, state) {
          addString(`;`);
        }
      },
      AssignmentExpression: {
        enter(path, state) {
          console.log(`assignment operator:${path.node.operator}.`);
        },
        exit(path, state) {
        }
      },
      Identifier(path, state) {
        const name = path.node.name;
        if (path.parent.type === 'AssignmentExpression') {
          addLine(`${name} `);
        } else { 
          if (path.parent.type !== 'MemberExpression' && path.parent.type !== 'FunctionDeclaration') {
            addString(` ${name} `);
          }
        }
        if (path.parent.type === 'VariableDeclarator') {
          addString(` = `);
        }
        if (path.parent.type === 'AssignmentExpression') {
          addString(` ${path.parent.operator} `);
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
          addLine(`let JS2NOldThis = JS2NThis;`)
          addLine(`let JS2NThis = Obj(env: JS2NOldThis.newEnv(), objType: ObjType.OTObject)`)
        },
        exit(path, state) {
          indentation -= 2;
          console.log("Exit FunctionDeclaration");
        }
      },
      BlockStatement: {
        enter(path, state) {
          console.log("Entered a BlockStatement");
        },
        exit(path, state) {
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
 
