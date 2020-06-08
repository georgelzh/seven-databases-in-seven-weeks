function insertCity(
	name, population, lastCensus,
	famousFor, mayorInfo){
	db.towns.insert({
		name: name,
		population: population,
		lastCensus: ISODate(lastCensus),
		famoursFor: famoursFor,
		mayor: mayorInfo
	});				
}
