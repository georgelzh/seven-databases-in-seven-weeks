var a = function (num) {
    var number = num,
    seen = [],
    result = [];
    i = number.length;
    while (i--) {
      console.log("i: ", i);
      seen[+number[i]] = 1
      console.log("+number[i]: " , number[i]);
      console.log("seen: ", seen);
    }
    console.log("final seen: ", seen)
    for (var i = 0; i < 10; i ++) {
      if (seen[i]) {
        result[result.length] = i
      }
    }
    console.log(result)
    return result
  }
  
  a("4014")
  
  // run the script check the output. 
  // you will understand how these code runs
  // and what it is doing.