package mmzk.genealogy.search

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.net.URI
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dao.Relationship
import mmzk.genealogy.dto.AdditionalProperty
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import mmzk.genealogy.tables.AdditionalPropertiesTable
import mmzk.genealogy.tables.IndividualTable
import mmzk.genealogy.tables.RelationshipTable
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction
import org.joda.time.DateTimeZone
import org.joda.time.LocalDateTime

object Database {
    private val dbUrl = System.getenv("DATABASE_URL")

    fun init() {
        Database.connect(hikari())
    }

    private fun hikari(): HikariDataSource {
        val config = HikariConfig()
        config.driverClassName = "org.postgresql.Driver"
        val url = URI(dbUrl)
        config.jdbcUrl = "jdbc:postgresql://" + url.host + url.path + "?sslmode=require"
        val (username, password) = url.userInfo.split(":")
        config.username = username
        config.password = password
        config.maximumPoolSize = 3
        config.isAutoCommit = false
        config.transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        config.validate()
        return HikariDataSource(config)
    }

    fun findPersonByName(name: String): List<IndividualDTO> = transaction {
        Individual.find { IndividualTable.name.regexp("(?i).*$name.*") }
            .limit(20).toDTOWithAdditionalProperties()
    }

    fun insertPeople(individuals: List<IndividualDTO>) = transaction {
        for (individual in individuals) {
            Individual.new(id = individual.id) {
                name = individual.name
                personalName = individual.personalName
                gender = individual.gender
                dateOfBirth = LocalDateTime.parse(individual.dateOfBirth).toDateTime(DateTimeZone.UTC)
                dateOfDeath = LocalDateTime.parse(individual.dateOfDeath).toDateTime(DateTimeZone.UTC)
                placeOfBirth = individual.placeOfBirth
                placeOfDeath = individual.placeOfDeath
                isCached = false
            }
        }
    }

    fun findRelatedPeople(ids: Set<String>, typeFilter: List<String>?, peopleFilter: List<String> = listOf()) =
        transaction TRANS@{
            val targets = Individual.find {
                IndividualTable.id.asStringColumn.inList(ids)
            }
            if (targets.empty()) {
                return@TRANS RelationsResponse.empty
            }
            val relationships = Relationship.find {
                var exp = RelationshipTable.person1.asStringColumn.inList(ids) or
                        RelationshipTable.person2.asStringColumn.inList(ids) and
                        RelationshipTable.person1.asStringColumn.notInList(peopleFilter) and
                        RelationshipTable.person2.asStringColumn.notInList(peopleFilter)
                if (typeFilter != null && typeFilter != listOf("all")) {
                    exp = exp and RelationshipTable.type.asStringColumn.inList(typeFilter)
                }
                exp
            }
            val individuals = relationships.mapNotNull {
                if (it.person1.id.value in ids && it.person2.id.value in ids) {
                    null
                } else if (it.person1.id.value in ids) {
                    it.person2
                } else {
                    it.person1
                }
            }

            RelationsResponse(
                targets = targets.toDTOWithAdditionalProperties(),
                people = individuals.toDTOWithAdditionalProperties(),
                relations = relationships.map(::RelationshipDTO)
            )
        }

    fun findRelatedPeople(id: String, typeFilter: List<String>?) =
        findRelatedPeople(setOf(id), typeFilter)

    private fun Iterable<Individual>.toDTOWithAdditionalProperties(): List<IndividualDTO> {
        val additionalPropertiesByIndividual = AdditionalPropertiesTable.select {
            AdditionalPropertiesTable.individualId.inList(this@toDTOWithAdditionalProperties.map { it.id.value })
        }.groupBy { it[AdditionalPropertiesTable.individualId] }
        return this.map { dao ->
            IndividualDTO(dao, additionalPropertiesByIndividual[dao.id.value]?.map(::AdditionalProperty) ?: listOf())
        }
    }

    fun findRelatedPeople(ids: Set<String>, typeFilter: List<String>?, peopleFilter: List<String> = listOf()) =
        transaction TRANS@{
            val targets = Individual.find {
                IndividualTable.id.asStringColumn.inList(ids)
            }
            if (targets.empty()) {
                return@TRANS RelationsResponse.empty
            }
            val relationships = Relationship.find {
                var exp = RelationshipTable.person1.asStringColumn.inList(ids) or
                        RelationshipTable.person2.asStringColumn.inList(ids) and
                        RelationshipTable.person1.asStringColumn.notInList(peopleFilter) and
                        RelationshipTable.person2.asStringColumn.notInList(peopleFilter)
                if (typeFilter != null && typeFilter != listOf("all")) {
                    exp = exp and RelationshipTable.type.asStringColumn.inList(typeFilter)
                }
                exp
            }
            val individuals = relationships.mapNotNull {
                if (it.person1.id.value in ids && it.person2.id.value in ids) {
                    null
                } else if (it.person1.id.value in ids) {
                    it.person2
                } else {
                    it.person1
                }
            }

            RelationsResponse(
                targets = targets.toDTOWithAdditionalProperties(),
                people = individuals.toDTOWithAdditionalProperties(),
                relations = relationships.map(::RelationshipDTO)
            )
        }

    private val Column<EntityID<String>>.asStringColumn get() = castTo<String>(VarCharColumnType(32))
}