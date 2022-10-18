package mmzk.genealogy.search

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dao.Relationship
import mmzk.genealogy.dto.AdditionalProperty
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import mmzk.genealogy.tables.AdditionalPropertiesTable
import mmzk.genealogy.tables.IndividualTable
import mmzk.genealogy.tables.RelationshipTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SqlExpressionBuilder.inList
import org.jetbrains.exposed.sql.SqlExpressionBuilder.regexp
import org.jetbrains.exposed.sql.transactions.transaction
import java.net.URI

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
        val daos = Individual.find { IndividualTable.name.regexp("(?i).*$name.*") }
            .limit(20)
        val additionalPropertiesByIndividual = AdditionalPropertiesTable.select {
            AdditionalPropertiesTable.individualId.inList(daos.map { it.id.value })
        }.groupBy { it[AdditionalPropertiesTable.individualId] }
        daos.map { dao ->
            IndividualDTO(dao, additionalPropertiesByIndividual[dao.id.value]?.map(::AdditionalProperty) ?: listOf())
        }
    }

    fun findRelatedPeople(id: String, typeFilter: List<String>?): RelationsResponse? = transaction TRANS@{
        val target = Individual.findById(id) ?: return@TRANS null
        val relationships = if (typeFilter != null && typeFilter != listOf("all")) {
            Relationship.find {
                (RelationshipTable.person1 eq id) or (RelationshipTable.person2 eq id) and
                        RelationshipTable.type.castTo<String>(VarCharColumnType(32)).inList(typeFilter)
            }
        } else {
            Relationship.find {
                (RelationshipTable.person1 eq id) or (RelationshipTable.person2 eq id)
            }
        }
        val individuals = relationships.map {
            IndividualDTO(
                if (it.person1.id.value == id) {
                    it.person2
                } else {
                    it.person1
                }
            )
        }

        RelationsResponse(
            target = IndividualDTO(target),
            people = individuals,
            relations = relationships.map(::RelationshipDTO)
        )
    }
}
