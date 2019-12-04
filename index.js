const Hyve = require('./interpreter');

Hyve.input(`
	fn fib = (num n) :
		if n == 1 :
			=> 0
		: elsif n == 2 :
			=> 1
		: else :
			=> fib(n - 1) + fib(n - 2)
		:
	:


	from 1 to 15 with i :
		print(i, fib(i))
	:
`);
