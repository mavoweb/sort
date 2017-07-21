(function() {

Mavo.Plugins.register("sort", {});

Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();
	var splitChar = ".";

	if (array.length === 0) {
		return arrayCopy;
	}

	arrayCopy.sort(function(prev, next) {
		// If it's an array of differnt types, we can't sort properly
		if (typeof(prev) !== typeof(next)) {
			return 0;
		}

		// If there's no properties, attempt to sort primitives in increasing
		// order by default
		var order = "+";
		if (properties.length === 0) {
			if (prev < next) {
				return -1;
			} else if (prev > next) {
				return 1;
			} else {
				return 0;
			}
		}

		// Sort objects by first property that doesn't result in a tie
		for (var propertyString of properties) {
			var order = propertyString[0] || "+";

			// TODO: what to do if order is not + or -
			order = order === "+" || order === "-" ? order : "+";
			var propertyString = propertyString.substring(1);
			
			// TODO: what to do if propertyString is empty string
			var nestedList = []
			if (propertyString.length > 0) {
				var nestedList = propertyString.split(splitChar);
			}

			for (property of nestedList) {
				if (property in prev && property in next) {
					prev = prev[property];
					next = next[property];
				} else {
					// TODO: alert failure? return 0? Continue sort anyway?
				}
			}

			if ((prev < next && order === "+") ||
			    (prev > next && order === "-")) {
				return -1;
			} else if ((prev > next && order === "+") ||
			           (prev < next && order === "-")) {
				return 1;
			}
			// If neither checks work, we have a tie, attempt again with
			// next property
		}

		// If they all result in a tie, return a tie
		return 0;
	});

	return arrayCopy;
}

})();
