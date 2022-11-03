package mmzk.genealogy

import io.ktor.http.*
import java.util.*
import kotlin.collections.*
import kotlinx.coroutines.*
import mmzk.genealogy.common.Database
import mmzk.genealogy.common.dto.*
import org.eclipse.rdf4j.query.TupleQueryResult
import org.eclipse.rdf4j.queryrender.RenderUtils
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository

class WikiDataDataSource(
    // TODO: make this functional, so that WikiDataCrawler can be moved into the common package
    private val relationshipTypeFilters: List<String>
) {
    // Translate a WikiData ID into a Database ID.
    private fun makeID(id: String): String = "WD-$id"

    private fun formatLocationWithCountry(location: String?, country: String?) =
        if (location != null && country != null) {
            "$location, $country"
        } else location ?: country

    private suspend fun parseRelationSearchResults(results: TupleQueryResult, typeMap: Map<String, String>) =
        coroutineScope {
            val relations = mutableSetOf<RelationshipDTO>()
            val newIndividuals = mutableSetOf<String>()
            for (result in results) {
                val row = mutableMapOf<String, String>()
                for (value in result) {
                    row[value.name] = value.value.stringValue()
                }
                val id = row[SPARQL.item]?.let(::Url)?.pathSegments?.lastOrNull()?.takeIf {
                    it.firstOrNull() == 'Q' || it.firstOrNull() == 'q'
                } ?: continue
                relations.addAll(typeMap.entries.mapNotNull {
                    Fields.parseID(it.key)?.second?.let { key ->
                        row[key]?.let(::Url)?.pathSegments?.lastOrNull()?.takeIf { otherID ->
                            otherID.firstOrNull() == 'Q' || otherID.firstOrNull() == 'q'
                        }?.let { otherID ->
                            RelationshipDTO(makeID(otherID), makeID(id), it.value, makeID(key))
                        }
                    }
                })
                newIndividuals.addAll(typeMap.entries.mapNotNull {
                    Fields.parseID(it.key)?.second?.let { key ->
                        row[key]?.let(::Url)?.pathSegments?.lastOrNull()
                    }
                })
            }

            relations to newIndividuals
        }

    private suspend fun parseIndividualSearchResults(results: TupleQueryResult) = coroutineScope {
        fun getHash(row: Map<String, String>, key: String) = run {
            row["${key}_"]?.split("/")?.last() ?: ""
        }

        val dtos = mutableMapOf<String, ItemDTO>()
        val personalNames = mutableMapOf<String, NameFormatter>()
        for (result in results) {
            val row = mutableMapOf<String, String>()
            for (value in result) {
                row[value.name] = value.value.stringValue()
            }
            val id = row[SPARQL.item]?.let(::Url)?.pathSegments?.lastOrNull()?.takeIf {
                it.firstOrNull() == 'Q' || it.firstOrNull() == 'q'
            } ?: continue
            if (!dtos.contains(id)) {
                val name = row[SPARQL.name]
                if (name != null) {
                    val description = row[SPARQL.description] ?: ""
                    val alias = row[SPARQL.alias]

                    dtos[id] = ItemDTO(makeID(id), name, description, alias)
                    personalNames[id] = NameFormatter()
                }
            }
            val dateOfBirth = row[SPARQL.dateOfBirth]?.let {
                AdditionalPropertyDTO(
                    makeID(Fields.dateOfBirth), "date of birth", it, getHash(row, SPARQL.dateOfBirth)
                )
            }
            val dateOfDeath = row[SPARQL.dateOfDeath]?.let {
                AdditionalPropertyDTO(
                    makeID(Fields.dateOfDeath), "date of death", it, getHash(row, SPARQL.dateOfDeath)
                )
            }
            val placeOfBirth = row["${SPARQL.placeOfBirth}Label"]?.let {
                AdditionalPropertyDTO(
                    makeID(Fields.placeOfBirth), "place of birth", it, getHash(row, SPARQL.placeOfBirth)
                )
            }
            val placeOfDeath = row["${SPARQL.placeOfDeath}Label"]?.let {
                AdditionalPropertyDTO(
                    makeID(Fields.placeOfDeath), "place of death", it, getHash(row, SPARQL.placeOfDeath)
                )
            }
            val placeOfBirthSW = formatLocationWithCountry(
                row["${SPARQL.placeOfBirth}Label"],
                row["${SPARQL.placeOfBirthCountry}Label"]
            )?.let { AdditionalPropertyDTO("SW-P2", "place of birth", it, "") }
            val placeOfDeathSW = formatLocationWithCountry(
                row["${SPARQL.placeOfDeath}Label"],
                row["${SPARQL.placeOfDeathCountry}Label"]
            )?.let { AdditionalPropertyDTO("SW-P3", "place of death", it, "") }
            val gender = row["${SPARQL.gender}Label"]?.let {
                AdditionalPropertyDTO(makeID(Fields.gender), "gender", it, getHash(row, SPARQL.gender))
            }
            val family = row["${SPARQL.family}Label"]?.let {
                AdditionalPropertyDTO(makeID(Fields.family), "family", it, getHash(row, SPARQL.family))
            }
            val givenName = row["${SPARQL.givenName}Label"]?.let {
                AdditionalPropertyDTO(makeID(Fields.givenName),
                    "given name",
                    it,
                    getHash(row, SPARQL.givenName),
                    setOfNotNull(
                        row[SPARQL.ordinal]?.let { ord -> QualifierDTO("WD-P1545", "series ordinal", ord) }
                    ))
            }
            val familyName = row["${SPARQL.familyName}Label"]?.let {
                AdditionalPropertyDTO(makeID(Fields.familyName), "family name", it, getHash(row, SPARQL.familyName),
                    setOfNotNull(
                        row["${SPARQL.familyNameType}Label"]?.let { role ->
                            QualifierDTO("WD-P3831", "object has role", role)
                        }
                    ))
            }

            dtos[id]?.let {
                it.additionalProperties = it.additionalProperties.union(
                    setOfNotNull(
                        dateOfBirth,
                        dateOfDeath,
                        placeOfBirth,
                        placeOfDeath,
                        placeOfBirthSW,
                        placeOfDeathSW,
                        gender,
                        family,
                        givenName,
                        familyName
                    )
                )
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
            dto.additionalProperties += AdditionalPropertyDTO(
                "SW-P1", "personal name",
                personalNames[id]?.formattedName ?: dto.name, ""
            )
        }
        dtos.values.toList()
    }

    suspend fun searchIndividualByName(partialName: String) = coroutineScope {
        val repo = SPARQLRepository(SPARQL.sparqlEndpoint)

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)

        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.alias} ?${SPARQL.description} ?${SPARQL.family}_ ?${SPARQL.family}Label ?${SPARQL.givenName}_ ?${SPARQL.givenName}Label ?${SPARQL.familyName}_ ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfBirth}_ ?${SPARQL.dateOfDeath} ?${SPARQL.dateOfDeath}_ ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirth}_ ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeath}_ ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label ?${SPARQL.gender}_ WHERE {
                  ?${SPARQL.item} wdt:P31 wd:Q5 .
                  OPTIONAL { ?${SPARQL.item} schema:description ?${SPARQL.description} .
                             FILTER ( lang(?${SPARQL.description}) = "en" ). }
                  OPTIONAL { ?${SPARQL.item} p:P53 ?${SPARQL.family}_ .
                             ?${SPARQL.family}_ ps:P53 ?${SPARQL.family} . }
                  OPTIONAL { ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                             ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                             OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . } }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                             OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} p:P569 ?${SPARQL.dateOfBirth}_ .
                             ?${SPARQL.dateOfBirth}_ ps:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} p:P570 ?${SPARQL.dateOfDeath}_ .
                             ?${SPARQL.dateOfDeath}_ ps:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P21 ?${SPARQL.gender}_ .
                             ?${SPARQL.gender}_ ps:P21 ?${SPARQL.gender} . }
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

        val answer = results?.let { parseIndividualSearchResults(it) } ?: listOf()
        repo.shutDown()
        answer
    }

    private suspend fun searchPropertyNameByIDs(ids: List<String>) = coroutineScope {
        val repo = SPARQLRepository(SPARQL.sparqlEndpoint)

        // TODO: Handle compound IDs
        val idMap = ids.mapNotNull { Fields.parseID(it)?.second?.let { value -> it to value } }.toMap()
        val queryLabels = idMap.values.joinToString(" ") { "?${it}Label" }
        val queryStrCore =
            idMap.values.joinToString("\n") { "OPTIONAL { ?$it wikibase:directClaim wdt:$it . }" }
        val queryStr = """
            SELECT $queryLabels WHERE {
              $queryStrCore
              SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
            }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(queryStr).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

        val answer = results?.let {
            val labelMap = it.next()
                .mapNotNull { row -> row.value?.let { value -> row.name!! to value.stringValue()!! } }.toMap()
            idMap.mapNotNull { entry -> labelMap["${entry.value}Label"]?.let { value -> entry.key to value } }.toMap()
        } ?: mapOf()
        repo.shutDown()
        Database.insertProperties(answer)
        answer
    }

    // Search for the WikiData entries with the given IDs.
    // The IDs must be raw WikiData IDs, thus starting with "Q" rather than "WD-".
    suspend fun searchIndividualByIDs(ids: List<String>) = coroutineScope {
        val repo = SPARQLRepository(SPARQL.sparqlEndpoint)

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)
        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.alias} ?${SPARQL.description} ?${SPARQL.family}_ ?${SPARQL.family}Label ?${SPARQL.givenName}_ ?${SPARQL.givenName}Label ?${SPARQL.familyName}_ ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfBirth}_ ?${SPARQL.dateOfDeath} ?${SPARQL.dateOfDeath}_ ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirth}_ ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeath}_ ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label ?${SPARQL.gender}_ WHERE {
                  VALUES ?${SPARQL.item} { ${ids.joinToString(" ") { "wd:$it" }} } .
                  OPTIONAL { ?${SPARQL.item} schema:description ?${SPARQL.description} .
                             FILTER ( lang(?${SPARQL.description}) = "en" ). }
                  OPTIONAL { ?${SPARQL.item} p:P53 ?${SPARQL.family}_ .
                             ?${SPARQL.family}_ ps:P53 ?${SPARQL.family} . }
                  OPTIONAL { ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                             ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                             OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . } }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                             OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} p:P569 ?${SPARQL.dateOfBirth}_ .
                             ?${SPARQL.dateOfBirth}_ ps:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} p:P570 ?${SPARQL.dateOfDeath}_ .
                             ?${SPARQL.dateOfDeath}_ ps:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P21 ?${SPARQL.gender}_ .
                             ?${SPARQL.gender}_ ps:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

        val answer = results?.let { parseIndividualSearchResults(it) } ?: listOf()
        repo.shutDown()
        answer
    }

    private suspend fun searchRelationByIDs(ids: List<String>, typeMap: Map<String, String>) = coroutineScope {
        val repo = SPARQLRepository(SPARQL.sparqlEndpoint)

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)
        // TODO: Handle compound types
        val queryLabels = typeMap.keys.joinToString(" ") { "?${Fields.parseID(it)?.second}" }
        val queryStrCore = typeMap.keys.joinToString("\n") {
            "OPTIONAL { ?item p:${Fields.parseID(it)?.second} [ps:${Fields.parseID(it)?.second} ?${
                Fields.parseID(it)?.second
            }; wikibase:rank ?${Fields.parseID(it)?.second}rank;] . }\nFILTER ( ?${Fields.parseID(it)?.second}rank != wikibase:DeprecatedRank )"
        }
        val querySelect = """
              SELECT ?${SPARQL.item} $queryLabels WHERE {
                  VALUES ?${SPARQL.item} { ${ids.joinToString(" ") { "wd:$it" }} } .

                  $queryStrCore
              }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }
        val answer =
            results?.let { parseRelationSearchResults(it, typeMap) }
                ?: (setOf<RelationshipDTO>() to setOf<String>())
        repo.shutDown()
        answer
    }

    suspend fun findRelatedPeople(id: String, depth: Int = 2) = coroutineScope {
        val visited = mutableSetOf<String>()
        var frontier = listOf(id)
        var curDepth = 0
        val typeMap = searchPropertyNameByIDs(relationshipTypeFilters)
        val targets = searchIndividualByIDs(frontier.mapNotNull { Fields.parseID(it)?.second })
        val people = mutableSetOf<ItemDTO>()
        val relations = mutableSetOf<RelationshipDTO>()

        while (true) {
            val newPeople = searchIndividualByIDs(frontier.mapNotNull { Fields.parseID(it)?.second })
            people.addAll(newPeople)
            visited.addAll(newPeople.map { it.id })
            if (curDepth >= depth) {
                break
            }
            val (newRelations, nextPeople) = searchRelationByIDs(
                frontier.mapNotNull { Fields.parseID(it)?.second },
                typeMap
            )
            relations.addAll(newRelations)
            frontier = nextPeople.map { "WD-$it" }.filter { !visited.contains(it) }
            curDepth++
        }

        RelationsResponse(targets, people.toList(), relations.toList())
    }

    private object SPARQL {
        const val sparqlEndpoint = "https://query.wikidata.org/sparql"
        const val item = "item"
        const val family = "family"
        const val description = "description"
        const val name = "itemLabel"
        const val alias = "itemAltLabel"
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
