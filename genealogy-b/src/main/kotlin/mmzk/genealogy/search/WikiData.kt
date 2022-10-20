package mmzk.genealogy.search

import io.ktor.http.*
import java.util.*
import kotlin.collections.*
import kotlinx.coroutines.*
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.IndividualName
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import mmzk.genealogy.tables.Fields
import org.eclipse.rdf4j.query.TupleQueryResult
import org.eclipse.rdf4j.queryrender.RenderUtils
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository

object WikiData {
    // Translate a WikiData ID into a Database ID.
    private fun makeID(id: String): String = "WD-$id"

    private fun formatLocationWithCountry(location: String?, country: String?) =
        if (location != null && country != null) {
            "$location, $country"
        } else location ?: country

    private suspend fun parseRelationSearchResults(results: TupleQueryResult) = coroutineScope {
        val relations = mutableSetOf<RelationshipDTO>()
        val newIndividuals = mutableSetOf<String>()
        for (result in results) {
            val row = mutableMapOf<String, String>()
            for (value in result) {
                row[value.name] = value.value.stringValue()
            }
            val id = row[SPARQL.item]?.let(::Url)?.pathSegments?.lastOrNull() ?: continue
            val father = row["father"]?.let(::Url)?.pathSegments?.lastOrNull()
            val mother = row["mother"]?.let(::Url)?.pathSegments?.lastOrNull()
            val spouse = row["spouse"]?.let(::Url)?.pathSegments?.lastOrNull()
            val child = row["issues"]?.let(::Url)?.pathSegments?.lastOrNull()

            relations.addAll(
                listOfNotNull(
                    father?.let { RelationshipDTO(makeID(id), makeID(it), "father", makeID(Fields.father)) },
                    mother?.let { RelationshipDTO(makeID(id), makeID(it), "mother", makeID(Fields.mother)) },
                    spouse?.let {
                        val sorted = listOf(id, it).sorted()
                        RelationshipDTO(makeID(sorted[0]), makeID(sorted[1]), "spouse", makeID(Fields.spouse))
                    },
                    child?.let {
                        when (row["${SPARQL.gender}Label"]) {
                            "male" -> RelationshipDTO(
                                makeID(it),
                                makeID(id),
                                "father",
                                makeID(Fields.father)
                            )
                            "female" ->RelationshipDTO(
                                makeID(it),
                                makeID(id),
                                "mother",
                                makeID(Fields.mother)
                            )
                            else -> null
                        }
                    })
            )
            newIndividuals.addAll(listOfNotNull(father, mother, spouse, child))
        }

        relations to newIndividuals
    }

    private suspend fun parseIndividualSearchResults(results: TupleQueryResult) = coroutineScope {
        val dtos = mutableMapOf<String, IndividualDTO>()
        val personalNames = mutableMapOf<String, IndividualName>()
        for (result in results) {
            val row = mutableMapOf<String, String>()
            for (value in result) {
                row[value.name] = value.value.stringValue()
            }
            val id = row[SPARQL.item]?.let(::Url)?.pathSegments?.lastOrNull()?.let { makeID(it) } ?: continue
            if (!dtos.contains(id)) {
                val name = row[SPARQL.name]
                if (name != null) {
                    dtos[id] = IndividualDTO(
                        id,
                        name,
                        "",
                        row[SPARQL.dateOfBirth],
                        row[SPARQL.dateOfDeath],
                        formatLocationWithCountry(
                            row["${SPARQL.placeOfBirth}Label"],
                            row["${SPARQL.placeOfBirthCountry}Label"]
                        ),
                        formatLocationWithCountry(
                            row["${SPARQL.placeOfDeath}Label"],
                            row["${SPARQL.placeOfDeathCountry}Label"]
                        ),
                        when (row["${SPARQL.gender}Label"]) {
                            "male" -> 'M'
                            "female" -> 'F'
                            else -> 'U'
                        }
                    )
                    personalNames[id] = IndividualName()
                }
            }
            row["${SPARQL.givenName}Label"]?.let { n ->
                personalNames[id]?.givenNames?.set(
                    row[SPARQL.ordinal]?.toIntOrNull() ?: 0, n
                )
            }
            row["${SPARQL.familyName}Label"]?.let { n ->
                if (row["${SPARQL.familyNameType}Label"] == "maiden name") {
                    personalNames[id]?.maidenName = n
                } else {
                    personalNames[id]?.marriageName = n
                }
            }
        }
        for ((id, dto) in dtos) {
            dto.personalName = personalNames[id]?.fullName ?: dto.name
        }
        dtos.values.toList()
    }

    suspend fun searchIndividualByName(partialName: String) = coroutineScope {
        val sparqlEndpoint = "https://query.wikidata.org/sparql"
        val repo = SPARQLRepository(sparqlEndpoint)
//        repo.init()

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)

        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.givenName}Label ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfDeath} ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label WHERE {
                  ?${SPARQL.item} wdt:P31 wd:Q5.

                  ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                  ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                  OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                             OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} wdt:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:mwapi {
                    bd:serviceParam wikibase:api "EntitySearch" .
                    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
                    bd:serviceParam mwapi:search "${RenderUtils.escape(partialName)}" .
                    bd:serviceParam mwapi:action "wbsearchentities" .
                    bd:serviceParam mwapi:language "en" .
                    ?item wikibase:apiOutputItem mwapi:item .
                  }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

//        repo.shutDown()
        results?.let { parseIndividualSearchResults(it) } ?: listOf()
    }

    suspend fun searchIndividualByIDs(ids: List<String>) = coroutineScope {
        val sparqlEndpoint = "https://query.wikidata.org/sparql"
        val repo = SPARQLRepository(sparqlEndpoint)
//        repo.init()

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)
        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.givenName}Label ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfDeath} ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label WHERE {
                  VALUES ?${SPARQL.item} { ${ids.joinToString(" ") { "wd:$it" }} } .

                  ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                  ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                  OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                              OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} wdt:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }
//        repo.shutDown()
        results?.let { parseIndividualSearchResults(it) } ?: listOf()
    }

    private suspend fun searchRelationByIDs(ids: List<String>) = coroutineScope {
        val sparqlEndpoint = "https://query.wikidata.org/sparql"
        val repo = SPARQLRepository(sparqlEndpoint)
//        repo.init()

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)
        val querySelect = """
              SELECT ?item ?father ?mother ?spouse ?issues ?${SPARQL.gender}Label WHERE {
                  VALUES ?${SPARQL.item} { ${ids.joinToString(" ") { "wd:$it" }} } .

                  OPTIONAL { ?item wdt:P22 ?father . }
                  OPTIONAL { ?item wdt:P25 ?mother . }
                  OPTIONAL { ?item wdt:P26 ?spouse . }
                  OPTIONAL { ?item wdt:P40 ?issues . }
                  OPTIONAL { ?${SPARQL.item} wdt:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

//        repo.shutDown()
        results?.let { parseRelationSearchResults(it) } ?: (setOf<RelationshipDTO>() to setOf<String>())
    }

    suspend fun findRelatedPeople(id: String, typeFilter: List<String>?, depth: Int = 2) = coroutineScope {
        val visited = mutableSetOf<String>()
        var frontier = listOf(id)
        var curDepth = 0
        val targets = searchIndividualByIDs(frontier.mapNotNull { Fields.parseID(it)?.second })
        val people = mutableSetOf<IndividualDTO>()
        val relations = mutableSetOf<RelationshipDTO>()

        while (true) {
            val newPeople = searchIndividualByIDs(frontier.mapNotNull { Fields.parseID(it)?.second })
            people.addAll(newPeople)
            visited.addAll(newPeople.map { it.id })
            if (curDepth >= depth) {
                break
            }
            val (newRelations, nextPeople) = searchRelationByIDs(frontier.mapNotNull { Fields.parseID(it)?.second })
            relations.addAll(newRelations)
            frontier = nextPeople.map { "WD-$it" }.filter { !visited.contains(it) }
            curDepth++
        }

        RelationsResponse(targets, people.toList(), relations.toList())
    }

    private object SPARQL {
        const val item = "item"
        const val name = "itemLabel"
        const val gender = "gender"
        const val givenName = "fname"
        const val familyName = "lname"
        const val ordinal = "ordinal"
        const val familyNameType = "maiden"
        const val dateOfBirth = "dateOfBirth"
        const val dateOfDeath = "dateOfDeath"
        const val placeOfBirth = "placeOfBirth"
        const val placeOfBirthCountry = "placeOfBirthCountry"
        const val placeOfDeath = "placeOfDeath"
        const val placeOfDeathCountry = "placeOfDeathCountry"
    }
}
