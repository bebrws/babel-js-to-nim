# Javascript To Nim

Using a babel plugin to parse and traverse the javascript AST in order to output nim code. 

This uses a small file, base.nim, which contains an object to emulate the Javascript object. 

Along with some other utility code used by the translationg.

To give this a try and convert sample.js to nim:

```
npm run sample
nim c out/out.nim
./out/out
```

You should then see the output you would almost see from running the sample.js file through node!