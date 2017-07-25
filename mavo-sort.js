(function($, $$) {

Mavo.Plugins.register("sort", {});

Mavo.Functions.sort = function(array, ...properties) {
	var arrayCopy = array.slice();

	if (array.length === 0) {
		return arrayCopy;
	}

	arrayCopy.sort(function(prev, next) {
		// If it's an array of different types, we can't sort properly
		if (typeof prev !== typeof next) {
			return 0;
		}

		// If there's no properties, attempt to sort primitives in increasing
		// order by default
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
			propertyString = propertyString.trim();
			if (propertyString.length === 0) {
				continue;
			}
			var inc = true;
			var incList = ["+"];
			var decList = ["-"];

			if (incList.indexOf(propertyString[0]) > -1) {
				propertyString = propertyString.substring(1);
			} else if (decList.indexOf(propertyString[0]) > -1) {
				inc = false;
				propertyString = propertyString.substring(1);
			}

			if (propertyString.length === 0) {
				continue;
			}

			var nestedList = propertyString.split(".");

			prev = $.value(prev, ...nestedList);
			next = $.value(next, ...nestedList);

			if ((prev < next && inc)||
			    (prev > next && !inc)) {
				return -1;
			} else if ((prev > next && inc) ||
			           (prev < next && !inc)) {
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

})(Bliss, Bliss.$);
