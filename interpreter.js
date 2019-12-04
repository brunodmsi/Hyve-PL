const memory = {
  print: {
    isNative: true,
    type: 'fn',
    name: 'print',
    params: [],
    body: (params) => {
      const arrToPrint = [];
      for (const i in params) {
        if (i === '0') continue;
        if (params[i].body) {
          arrToPrint.push(params[i].body);
        } else if (typeof params[i] === 'number') {
          arrToPrint.push(params[i]);
        } else {
          arrToPrint.push(params[i].split('').filter((e) => {
            if (e === '"') return false;
            return true;
          }).join(''));
        }
      }
      arrToPrint.length === 1 ? console.log(arrToPrint[0]) : console.log(arrToPrint.join(' '));
    },
  },
  push: {
    isNative: true,
    type: 'fn',
    name: 'push',
    params: [],
    body: (params) => {
      const thiss = params[0];
      const arrVariable = params[1];
      let thingToPush = params[2];
      if (parseInt(thingToPush)) thingToPush = parseInt(thingToPush);
      if (typeof thingToPush === 'object') thingToPush = thingToPush.body;
      const arrToPushTo = thiss.getVariable(arrVariable.name).body;
      arrToPushTo.push(thingToPush);
      thiss.memory[arrVariable.name].body = arrToPushTo;
    },
  },
  index: {
    isNative: true,
    type: 'fn',
    name: 'index',
    params: [],
    body: (params) => {
      const thiss = params[0];
      const arrVariable = params[1];
      const indexToGet = params[2];
      const returnVal = thiss.getVariable(arrVariable.name).body[indexToGet];
      return returnVal;
    },
  },
};

function Interpreter(memory) {
  this.memory = memory;

  this.stack = [];
  this.queue = [];
}

/* TOKENIZATION & INPUT METHODS */

Interpreter.prototype.tokenize = function (text, logger) {
  const regex = /\s*(=>|["-+*\][\/\%:\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;
  return text.split(regex).filter((s) => !s.match(/^\s*$/));
};

Interpreter.prototype.input = function (text, logger = false) {
  this.tokens = this.tokenize(text);
//  console.log(this.tokens);
  if (!this.tokens.length) {
    return '';
  }
  return this.program();
};

/* MEMORY METHODS */

Interpreter.prototype.getVariable = function (name) {
  return this.memory[name];
};

Interpreter.prototype.addVariable = function (type, name, params, body) {
  this.memory[name] = {
    isNative: false,
    name,
    type,
    params,
    body,
  };
};

Interpreter.prototype.resetParams = function (name) {
  const func = this.getVariable(name);
  func.params = [];
};

/* CORE METHODS */

Interpreter.prototype.peek = function () {
  return this.tokens[0] || null;
};

Interpreter.prototype.get = function () {
  return this.tokens.shift();
};

Interpreter.prototype.consumeAndRunUntilBreak = function () {
  this.get();
  const returnValue = [];
  while (!this.isWrapper() && this.tokens.length) returnValue.push(this.get());
  const newInterpreter = new Interpreter(this.memory);
  return newInterpreter.input(returnValue.join(' '));
};

Interpreter.prototype.consumeUntilFunctionWrapper = function (char, returnType) {
  let returnValue;
  switch (returnType) {
    case 'string':
      returnValue = '';
      while (this.peek() !== char) returnValue += this.get();
      break;
    case 'array':
      returnValue = [];
      const conditionalKeywords = ['if', 'elsif', 'else'];
      const isLoopKeywords = ['from'];
      let wrapperCounter = 0;
      let conditionalKeywordCounter = 0;
      let testCounter = 0;
      if (char === ':') {
        while (this.peek() !== char || wrapperCounter !== conditionalKeywordCounter * 2 || this.isConditionalKeyword()) {
          if (this.isWrapper()) wrapperCounter += 1;
          if (this.isConditionalKeyword() || this.isLoopKeyword()) conditionalKeywordCounter += 1;
          returnValue.push(this.get());
          testCounter += 1;
        }
      } else {
        while (this.peek() !== char) {
          returnValue.push(this.get());
        }
      }
      break;
    default:
      break;
  }

  return returnValue;
};

Interpreter.prototype.consumeUntil = function (char, returnType) {
  let returnValue;
  switch (returnType) {
    case 'string':
      returnValue = '';
      while (this.peek() !== char) returnValue += this.get();
      break;
    case 'array':
      returnValue = [];
      const conditionalKeywords = ['if', 'elsif', 'else'];
      const isLoopKeywords = ['from'];
      let wrapperCounter = 0;
      let conditionalKeywordCounter = 0;
      let testCounter = 0;
      if (char === ':') {
        while (this.peek() !== char || wrapperCounter !== conditionalKeywordCounter * 2) {
          if (this.isWrapper()) wrapperCounter++;
          if (this.isConditionalKeyword() || this.isLoopKeyword()) conditionalKeywordCounter++;
          returnValue.push(this.get());
          testCounter++;

          if (testCounter > 100) break;
        }
      } else if (char === ')') {
        let openingParenCounter = 0;
        let closingParenCounter = 0;
        while (this.peek() !== char || openingParenCounter !== closingParenCounter) {
          if (this.isOpeningParen()) openingParenCounter++;
          if (this.isClosingParen()) closingParenCounter++;
          returnValue.push(this.get());
          testCounter++;
          if (testCounter > 100) break;
        }
      } else {
        while (this.peek() !== char) {
          returnValue.push(this.get());
        }
      }
      break;
    default:
      break;
  }

  return returnValue;
};

Interpreter.prototype.replace = function (thingToReplace, thingToReplaceWith, arr) {
  return arr.map((e) => {
    if (e === thingToReplace) return thingToReplaceWith;
    return e;
  });
};

Interpreter.prototype.convertArr = function (testArr) {
  let arrToReturn = testArr;
  const openingIndex = testArr.indexOf('[');
  const closingIndex = testArr.lastIndexOf(']');
  if (openingIndex !== -1) {
    const substr = testArr.substring(openingIndex + 1, closingIndex);
    arrToReturn = Array.from(substr).filter((e) => {
      if (e === ',') return false;
      return true;
    });
  }
  for (const i in arrToReturn) {
    if (parseInt(arrToReturn[i])) arrToReturn[i] = parseInt(arrToReturn[i]);
  }
  return arrToReturn;
};

/* KEYWORD METHODS */

Interpreter.prototype.isFunctionKeyword = function () {
  return this.peek() === 'fn';
};

Interpreter.prototype.isVariableKeyword = function () {
  return ['fn', 'num', 'str', 'arr', 'bool'].includes(this.peek());
};

Interpreter.prototype.isConditionalKeyword = function () {
  return ['if', 'elsif', 'else'].includes(this.peek());
};

Interpreter.prototype.isLoopKeyword = function () {
  return ['from'].includes(this.peek());
};

Interpreter.prototype.getConditionalKeyword = function () {
  return this.peek();
};

Interpreter.prototype.getLoopKeyword = function () {
  return this.peek();
};

/* OPERATOR METHODS */

Interpreter.prototype.isWrapper = function () {
  return this.peek() === ':';
};

Interpreter.prototype.isOpeningArr = function () {
  return this.peek() === '[';
};

Interpreter.prototype.isClosingArr = function () {
  return this.peek() === ']';
};

Interpreter.prototype.isStringWrapper = function () {
  return this.peek() === '"';
};

Interpreter.prototype.isAssignmentOperator = function () {
  return this.peek() === '=';
};

Interpreter.prototype.isComparisonOperator = function () {
  return this.peek() === '==';
};

Interpreter.prototype.isTermOperator = function () {
  return '+-'.includes(this.peek());
};

Interpreter.prototype.isFactorOperator = function () {
  return '*/%'.includes(this.peek());
};

Interpreter.prototype.isAdditiveInverseOperator = function () {
  return this.peek() === '-';
};

Interpreter.prototype.isOpeningParen = function () {
  return this.peek() === '(';
};

Interpreter.prototype.isClosingParen = function () {
  return this.peek() === ')';
};

Interpreter.prototype.isReturnOperator = function () {
  return this.peek() === '=>';
};

/* PRIMITIVE TYPE METHODS */

Interpreter.prototype.isLetter = function () {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters.includes(this.peek()[0]);
};

Interpreter.prototype.isDigit = function () {
  return '0123456789'.includes(this.peek()[0]);
};

Interpreter.prototype.isBoolean = function () {
  return ['true', 'false'].includes(this.peek());
};

Interpreter.prototype.getNumber = function () {
  if (!this.isDigit()) {
    return null;
  }
  return parseFloat(this.get());
};

Interpreter.prototype.getIdentifier = function () {
  if (!this.isLetter()) {
    return null;
  }
  return this.get();
};

/* MAJOR OPERATION METHODS */

Interpreter.prototype.functionCall = function (currentFunction) {
  if (!this.isOpeningParen()) throw new Error('A function call must have arguments wrapped in parentheses!');
  this.get();
  let currentArguments = this.consumeUntil(')', 'array');
  if (currentArguments.length) currentArguments = currentArguments.join('').split(',');
  if (!this.isClosingParen()) throw new Error('A function call must have arguments wrapped in parentheses!');
  this.get();
  if (currentFunction.isNative) {
    currentFunction.params.push(this);
    for (const i in currentArguments) {
      const funcName = currentArguments[i].substring(0, currentArguments[i].indexOf('('));
      if (this.getVariable(currentArguments[i])) {
        currentFunction.params.push(this.getVariable(currentArguments[i]));
      } else if (this.getVariable(funcName)) {
        const newInterpreter = new Interpreter(this.memory);
        currentFunction.params.push(newInterpreter.input(currentArguments[i]));
      } else {
        currentFunction.params.push(currentArguments[i]);
      }
    }
    const returnVal = currentFunction.body(currentFunction.params);
    this.resetParams(currentFunction.name);

    return returnVal;
  }
  const otherInterpreter = new Interpreter(this.memory);
  let bodyToParse = currentFunction.body.slice(0);
  for (let j = 0; j < currentArguments.length; j += 1) {
    let currentArgument;
    if (this.getVariable(currentArguments[j]) && this.getVariable(currentArguments[j]).type === 'fn') {
      currentArgument = currentArguments[j];
    } else {
      currentArgument = otherInterpreter.input(currentArguments[j]) || currentArguments[j];
    }
    const parameterToReplace = currentFunction.params[j].name;
    switch (currentFunction.params[j].type) {
      case 'num':
        if (typeof parseFloat(currentArgument) !== 'number' || isNaN(parseFloat(currentArgument))) throw new Error('Functions should only be called with parameters of the correct type!');
        break;
      case 'str':
        if (currentArgument[0] !== '"') throw new Error('Functions should only be called with parameters of the correct type!');
        break;
      case 'bool':
        if (currentArgument !== 'true' && currentArgument !== 'false') throw new Error('Functions should only be called with parameters of the correct type!');
        break;
      case 'fn':
        if (!this.getVariable(currentArgument) || this.getVariable(currentArgument).type !== 'fn') throw new Error('Functions should only be called with parameters of the correct type!');
        break;
      case 'arr':
        break;
      default:
        throw new Error('Functions should only be called with parameters of the correct type!');
        break;
    }
    bodyToParse = bodyToParse.map((element) => {
      if (element === parameterToReplace) {
        return currentArgument;
      }
      return element;
    });
  }
  return otherInterpreter.input(bodyToParse.join(' '));
};

Interpreter.prototype.factor = function () {
  let factorResult = this.getNumber();
  if (factorResult !== null) {
    return factorResult;
  } if (this.isStringWrapper()) {
    this.get();
    factorResult = this.consumeUntil('"', 'string');
    this.get();
    return factorResult;
  }
  if (this.isAdditiveInverseOperator()) {
    this.get();
    factorResult = this.factor();
    return -factorResult;
  } if (this.isOpeningParen()) {
    this.get();
    factorResult = this.expression();
    if (!this.isClosingParen()) throw new Error('Parentheses should always be properly closed!');
    this.get();
    return factorResult;
  } if (this.isBoolean()) {
    factorResult = this.get();
    return factorResult;
  } if (this.isOpeningArr()) {
    factorResult = this.peek();
    factorResult = this.consumeUntil(']', 'string');
    factorResult += this.peek();
    this.get();
    return factorResult;
  }
  factorResult = this.getIdentifier();
  if (factorResult) {
    const variable = this.getVariable(factorResult);
    if (variable) {
      switch (variable.type) {
        case 'fn':
          return this.functionCall(variable);
          break;
        default:
          return variable.body;
          break;
      }
    } else {
      throw new Error(`The identifier ${factorResult} was never declared as a variable!`);
    }
  }
};

Interpreter.prototype.term = function () {
  let termResult = this.factor();
  while (this.isFactorOperator()) {
    if (this.peek() === '*') {
      this.get();
      termResult *= this.factor();
    } else if (this.get() === '/') {
      termResult /= this.factor();
    } else {
      termResult %= this.factor();
    }
  }
  return termResult;
};

Interpreter.prototype.expression = function () {
  let expressionResult = this.term();
  while (this.isTermOperator()) {
    if (this.get() === '+') {
      expressionResult += this.term();
    } else {
      expressionResult -= this.term();
    }
  }
  return expressionResult;
};

Interpreter.prototype.comparison = function () {
  const firstExpression = this.expression();
  if (this.isComparisonOperator()) {
    this.get();
    return firstExpression === this.expression();
  }
  if (typeof firstExpression !== 'boolean') throw new Error('A condition must be a boolean!');
  return firstExpression;
};

/* DECLARATIONS, LOOPS, & CONDITIONALS METHODS */

Interpreter.prototype.functionDeclaration = function () {
  if (!this.isOpeningParen()) throw new Error("A function's parameters should always be wrapped in parentheses!");
  this.get();
  let functionParameters = this.consumeUntil(')', 'array');
  const validParameterTypes = ['fn', 'num', 'str', 'arr', 'bool'];
  for (let i = 0; i < functionParameters.length; i += 1) {
    const currentElement = functionParameters[i];
    if (i % 3 === 0 && !['fn', 'num', 'str', 'arr', 'bool'].includes(currentElement)) {
      throw new Error('All function parameters must have valid types!');
    } else if (i % 3 === 1) {
    //
    } else if (i % 3 === 2 && currentElement !== ',') {
      throw new Error('All function parameters must be separated by commas!');
    }
  }
  functionParameters = functionParameters.filter((element) => element !== ',');
  const actualFunctionParameters = [];
  for (let j = 1; j < functionParameters.length; j += 2) {
    actualFunctionParameters.push({
      type: functionParameters[j - 1],
      name: functionParameters[j],
    });
  }
  if (!this.isClosingParen()) throw new Error("A function's parameters should always be wrapped in parentheses!");
  this.get();
  if (!this.isWrapper()) throw new Error('A function declaration requires an opening wrapper!');
  this.get();
  const functionBody = this.consumeUntilFunctionWrapper(':', 'array');
  if (!this.isWrapper()) throw new Error('A function declaration requires a closing wrapper!');
  this.get();
  return [actualFunctionParameters, functionBody];
};

Interpreter.prototype.variableDeclaration = function () {
  const variableType = this.get();
  const variableName = this.getIdentifier();
  let variableParams = null;
  let variableBody;
  if (!this.isAssignmentOperator()) throw new Error('A variable declaration requires a valid assignment operator!');
  this.get();
  switch (variableType) {
    case 'fn':
      const functionInformation = this.functionDeclaration();
      variableParams = functionInformation[0];
      variableBody = functionInformation[1];
      break;
    case 'num':
      variableBody = this.expression();
      if (typeof variableBody !== 'number') throw new Error("The 'num' type requires a valid number!");
      break;
    case 'str':
      variableBody = this.expression();
      if (typeof variableBody !== 'string') throw new Error("The 'str' type requires a valid string!");
      break;
    case 'arr':
      variableBody = this.expression();
      variableBody = this.convertArr(variableBody);
      if (!Array.isArray(variableBody)) throw new Error("The 'arr' type requires a valid array!");
      break;
    case 'bool':
      variableBody = this.expression();
      if (typeof variableBody !== 'boolean') throw new Error("The 'bool type requires a valid boolean!");
      break;
    default:
      throw new Error('Variable assignment requires a valid variable type!');
  }
  this.addVariable(variableType, variableName, variableParams, variableBody);
};

Interpreter.prototype.conditional = function () {
  if (this.getConditionalKeyword() !== 'if') {
    this.consumeUntil(':', 'array');
  } else {
    this.get();
    let condition = this.comparison();
    while (!condition) {
      if (!this.isWrapper()) throw new Error('A conditional statement requires an opening wrapper!');
      this.get();
      this.consumeUntil(':', 'array');
      if (!this.isWrapper()) throw new Error('A conditional statement requires a closing wrapper!');
      this.get();
      if (this.isConditionalKeyword()) {
        if (this.getConditionalKeyword() === 'else') {
          this.get();
          if (!this.isWrapper()) throw new Error('A conditional statement requires an opening wrapper!');
          this.get();
          if (this.isReturnOperator()) {
            return this.program();
          }
          this.program();

          if (!this.isWrapper()) throw new Error('A conditional statement requires a closing wrapper!');
          this.get();
          break;
        } else if (this.getConditionalKeyword() === 'elsif') {
          this.get();
          condition = this.comparison();
        } else {
          break;
        }
      } else {
        break;
      }
    }
    if (condition) {
      if (!this.isWrapper()) throw new Error('A conditional statement requires an opening wrapper!');
      this.get();
      if (this.isReturnOperator()) {
        return this.program();
      }
      this.program();

      if (!this.isWrapper()) throw new Error('A conditional statement requires a closing wrapper!');
      this.get();
    }
  }
};

Interpreter.prototype.loop = function () {
  let firstIndex; let finalIndex; let variableName; let
    loopBody;
  if (this.peek() === 'from') {
    this.get();
    if (isNaN(this.peek())) throw new Error('A from loop should be followed by a number!');
    firstIndex = this.get();
    if (this.peek() !== 'to') throw new Error('A from loop should always include the "to" keyword!');
    this.get();
    if (isNaN(parseInt(this.peek()))) throw new Error('The "to" keyword should always be followed by a number!');
    finalIndex = this.get();
    if (this.peek() !== 'with') throw new Error('A from loop should always include the "with" keyword!');
    this.get();
    if (!this.isLetter()) throw new Error('The "with" keyword should always be followed by a proper identifier!');
    variableName = this.get();
    if (!this.isWrapper()) throw new Error('A from loop should always have a proper wrapper!');
    this.get();
    loopBody = this.consumeUntil(':', 'array');
    const children = [];
    firstIndex = parseInt(firstIndex);
    finalIndex = parseInt(finalIndex);
    if (firstIndex <= finalIndex) {
      for (var i = firstIndex; i <= finalIndex; i += 1) {
        children.push(this.replace(variableName, i, loopBody));
      }
    } else if (firstIndex > finalIndex) {
      for (var i = firstIndex; i >= finalIndex; i--) {
        children.push(this.replace(variableName, i, loopBody));
      }
    }
    children.forEach((e) => {
      const otherInterpreter = new Interpreter(this.memory);
      otherInterpreter.input(e.join(' '));
    });
  } else if (this.peek() === 'while') {

  } else {
    throw new Error('Invalid loop type m8!');
  }
};

Interpreter.prototype.program = function () {
  while (this.tokens.length) {
    if (this.isVariableKeyword()) {
      this.variableDeclaration();
    } else if (this.isConditionalKeyword()) {
      const possibleReturnValue = this.conditional();
      if (possibleReturnValue !== undefined) return possibleReturnValue;
    } else if (this.isLoopKeyword()) {
      this.loop();
    } else if (this.isReturnOperator()) {
      return this.consumeAndRunUntilBreak();
    } else {
      const result = this.expression();
      return result;
    }
  }
};


module.exports = new Interpreter(memory);

// Hyve.input(`

// num one = 1
// num three = 3
// str hello = "hello"
// arr array = [1, 2, 3, 4, 5, 6, 7]
// fn add = (num a, num b) :
//   => a + b
// :
// fn echo = (num a) :
//   => a
// :

// `);

// BASIC FUNCTION CALLING

// Hyve.input(`

// 	add(one, three) + add(echo(one), three)

// `)

// BASIC IF / ELSE STATEMENTS

// Hyve.input(`

// 	if 3 == 3 :
// 		print("First!")
// 	: elsif echo(one) == 1 :
// 		print("Second!")
// 	: else :
// 		print("Third!")
// 	:

// `)

// BASIC FROM TO LOOPS

// Hyve.input(`

// 	from 0 to 6 with i :
// 		num currentIndexValue = index(array, i)
// 		print(currentIndexValue)
// 	:

// `)

// NESTED FROM TO LOOPS

// Hyve.input(`

// 	from 1 to 3 with i :
// 		from 1 to 3 with j :
// 			from 1 to 3 with k :
// 				print(i, j, k)
// 			:
// 		:
// 	:

// `)

// FIZZBUZZ

// Hyve.input(`

// 	fn fizzBuzz = (num n) :
// 		from 1 to n with i :
// 			if i % 15 == 0 :
// 				print("FizzBuzz")
// 			: elsif i % 5 == 0 :
// 				print("Buzz")
// 			: elsif i % 3 == 0 :
// 				print("Fizz")
// 			: else :
// 				print(i)
// 			:
// 		:
// 	:

// `)

// Hyve.input(`

// 	fizzBuzz(35)

// `)

// RECURSION & FIBONACCI

// Hyve.input(`

// 	fn fib = (num n) :
// 		if n == 1 :
// 			=> 0
// 		: elsif n == 2 :
// 			=> 1
// 		: else :
// 			=> fib(n - 1) + fib(n - 2)
// 		:
// 	:

// `)

// Hyve.input(`

// 	from 1 to 15 with i :
// 		print(i, fib(i))
// 	:

// `)

// ORDER OF OPERATIONS

// Hyve.input(`

// 	fn alwaysTwo = (num n) :
// 		=> ((((n + 47 % (19 * add(-3, 5))) * echo(three - one) - 4) / fib(4) - n + fib(echo(10)) - 29) * 3 - 9) / 3 - (((n + 109 % 10) * 2 - 4) / 2 - n)
// 	:

// `)

// Hyve.input(`

// 	alwaysTwo(4751)

// `)
