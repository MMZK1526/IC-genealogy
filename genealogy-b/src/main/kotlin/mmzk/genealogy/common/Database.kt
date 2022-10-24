package mmzk.genealogy.common

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.coroutines.selects.select
import java.net.URI
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.dao.Relationship
import mmzk.genealogy.common.dto.AdditionalProperty
import mmzk.genealogy.common.dto.ItemDTO
import mmzk.genealogy.common.dto.RelationsResponse
import mmzk.genealogy.common.dto.RelationshipDTO
import mmzk.genealogy.common.tables.AdditionalPropertiesTable
import mmzk.genealogy.common.tables.ItemTable
import mmzk.genealogy.common.tables.PropertyTypeTable
import mmzk.genealogy.common.tables.RelationshipTable
import mmzk.genealogy.common.tables.RelationshipTable.type
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction

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

    fun findItemByName(name: String): List<ItemDTO> = transaction {
        Item.find { ItemTable.name.regexp("(?i).*$name.*") }
            .limit(20).toDTOWithAdditionalProperties()
    }

    fun insertItems(items: List<ItemDTO>) = transaction {
        for (item in items) {
            Item.new(id = item.id) {
                name = item.name
                description = item.description
            }

            for (property in item.additionalProperties) {
                AdditionalPropertiesTable.insert {
                    it[itemId] = item.id
                    it[propertyId] = property.propertyId
                    it[value] = property.value
                }
            }
        }
    }

    private fun findRelatedItems(ids: Set<String>, typeFilter: List<String>?, itemsFilter: List<String> = listOf()) =
        transaction TRANS@{
            val targets = Item.find {
                ItemTable.id.asStringColumn.inList(ids)
            }
            if (targets.empty()) {
                return@TRANS RelationsResponse.empty
            }
            val relationships = Relationship.find {
                var exp = RelationshipTable.item1.asStringColumn.inList(ids) or
                        RelationshipTable.item2.asStringColumn.inList(ids) and
                        RelationshipTable.item1.asStringColumn.notInList(itemsFilter) and
                        RelationshipTable.item2.asStringColumn.notInList(itemsFilter)
                if (typeFilter != null && typeFilter != listOf("all")) {
                    exp = exp and RelationshipTable.type.asStringColumn.inList(typeFilter)
                }
                exp
            }
            val items = relationships.mapNotNull {
                if (it.item1.id.value in ids && it.item2.id.value in ids) {
                    null
                } else if (it.item1.id.value in ids) {
                    it.item2
                } else {
                    it.item1
                }
            }

            RelationsResponse(
                targets = targets.toDTOWithAdditionalProperties(),
                items = items.toDTOWithAdditionalProperties(),
                relations = relationships.map(::RelationshipDTO)
            )
        }

    fun findRelatedItems(id: String, typeFilter: List<String>?) =
        findRelatedItems(setOf(id), typeFilter)

    private fun Iterable<Item>.toDTOWithAdditionalProperties(): List<ItemDTO> {
        val additionalPropertiesByItem = AdditionalPropertiesTable.innerJoin(PropertyTypeTable).select {
            AdditionalPropertiesTable.itemId.inList(this@toDTOWithAdditionalProperties.map { it.id.value })
        }.groupBy { it[AdditionalPropertiesTable.itemId] }
        return this.map { dao ->
            ItemDTO(dao, additionalPropertiesByItem[dao.id.value]?.map(::AdditionalProperty) ?: listOf())
        }
    }

    private val Column<EntityID<String>>.asStringColumn get() = castTo<String>(VarCharColumnType(32))
}