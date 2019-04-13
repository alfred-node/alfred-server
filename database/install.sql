
ALTER DATABASE CHARACTER SET utf8 COLLATE utf8_unicode_ci ;

-- Database management utils --
-- databaseAddColumn
--

DROP PROCEDURE IF EXISTS databaseAddColumn;

DELIMITER ;;
CREATE PROCEDURE databaseAddColumn(
	tableName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colType VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci
)
BEGIN 
    SET @s = (SELECT IF(
		(SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE table_name = tableName
			AND table_schema = DATABASE()
			AND column_name = colName
		) > 0,
		"SELECT 1",
		CONCAT("ALTER TABLE ", tableName, " ADD ", colName, " ", colType)
	));

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;

-- databaseAddKey
--

DROP PROCEDURE IF EXISTS databaseAddKey;

DELIMITER ;;
CREATE PROCEDURE databaseAddKey(
	tableName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colNames VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	keyName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci
)
BEGIN 
    SET @s = (SELECT IF(
		(SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE table_name = tableName
			AND table_schema = DATABASE()
			AND index_name = keyName
		) > 0,
		"SELECT 1",
		CONCAT("CREATE INDEX ", keyName, " ON ", tableName, " (", colNames, ")")
	));

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;

-- utcSeconds
-- Converts seconds from the unix epoch into a time

DROP FUNCTION IF EXISTS utcSeconds;
DELIMITER ;;
CREATE FUNCTION utcSeconds(
	seconds BIGINT
) RETURNS DATE DETERMINISTIC
BEGIN
    RETURN DATE_ADD(FROM_UNIXTIME(0), INTERVAL + seconds SECOND);
END;;
DELIMITER ;

-- decimal_trim 
-- Drops trailing 0's and decimal points from big decimal valeus
DROP FUNCTION IF EXISTS decimal_trim ;
DELIMITER ;;
CREATE FUNCTION decimal_trim(
  amount decimal(40,20)
) RETURNS varchar(41) DETERMINISTIC
BEGIN
  -- First Trim the 0's
    RETURN TRIM(Trailing '.' FROM TRIM(Trailing '0' FROM amount));
END;;
DELIMITER ;


-- End of utils; Structure starts here


--
-- Table structure for table `build_stage_properties`
--

CREATE TABLE IF NOT EXISTS `build_stage_properties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `build` varchar(45) DEFAULT NULL,
  `stage` int(11) DEFAULT NULL,
  `stageName` varchar(200) DEFAULT NULL,
  `properties` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `builds`
--

CREATE TABLE IF NOT EXISTS `builds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `versionMajor` int(11) DEFAULT '0',
  `versionMinor` int(11) DEFAULT NULL,
  `versionPatch` int(11) DEFAULT NULL,
  `pipeline` int(11) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `started` datetime DEFAULT NULL,
  `finished` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8;

--
-- Table structure for table `extensions`
--

CREATE TABLE IF NOT EXISTS `extensions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8_unicode_ci,
  `active` int(1) DEFAULT NULL,
  `version` varchar(45) COLLATE utf8_unicode_ci DEFAULT NULL,
  `npmPackage` varchar(80) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Table structure for table `forgottokens`
--

CREATE TABLE IF NOT EXISTS `forgottokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(32) CHARACTER SET latin1 DEFAULT NULL,
  `user` int(11) DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `TOKEN` (`token`),
  KEY `USER` (`user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Table structure for table `groups`
--

CREATE TABLE IF NOT EXISTS `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `parentGroup` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `deleted` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `pipelines`
--

CREATE TABLE IF NOT EXISTS `pipelines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `directory` varchar(45) DEFAULT NULL,
  `nextVersionMajor` int(11) DEFAULT NULL,
  `nextVersionMinor` int(11) DEFAULT NULL,
  `nextVersionPatch` int(11) DEFAULT NULL,
  `group` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `deleted` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

--
-- Table structure for table `ranks`
--

CREATE TABLE IF NOT EXISTS `ranks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) COLLATE utf8_unicode_ci DEFAULT NULL,
  `isDefault` int(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Table structure for table `statuses`
--

CREATE TABLE IF NOT EXISTS `statuses` (
  `id` int(11) NOT NULL,
  `name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `templates`
--

CREATE TABLE IF NOT EXISTS `templates` (
  `templateID` int(11) NOT NULL AUTO_INCREMENT,
  `subject` text,
  `html` text,
  `text` text,
  `sms` text,
  `name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`templateID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Table structure for table `tokens`
--

CREATE TABLE IF NOT EXISTS `tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(32) CHARACTER SET latin1 DEFAULT NULL,
  `user` int(11) DEFAULT NULL,
  `assigned` datetime DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `USER_TOKEN` (`user`,`token`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `displayName` varchar(45) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(45) COLLATE utf8_unicode_ci DEFAULT NULL,
  `passhash` varchar(270) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `rank` int(11) DEFAULT NULL,
  `ui` int(11) DEFAULT NULL,
  `theme` text COLLATE utf8_unicode_ci,
  `deleted` int(1) NOT NULL DEFAULT '0',
  `active` int(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- createBuildInfo
--

DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `createBuildInfo`(pipeId int, status int)
BEGIN
	declare major int;
	declare minor int;
	declare patch int;
	declare name VARCHAR(45);
	-- Pull the next version number:
	update pipelines set nextVersionPatch = LAST_INSERT_ID(nextVersionPatch + 1) where id = pipeId;
	select nextVersionMajor, nextVersionMinor, pipelines.`name` into major, minor, name from pipelines where id=pipeId;
	select LAST_INSERT_ID() into patch;
	
	-- Insert it as a new build:
	insert into builds(versionMajor, versionMinor, versionPatch, pipeline, status, started) values(major, minor, patch - 1, pipeId, status, NOW());
	
	-- Return the build ID:
	select 
		LAST_INSERT_ID() as id,
		major as versionMajor,
		minor as versionMinor,
		patch as versionPatch,
        pipeId as pipeline,
		name as pipelineName,
        status as status;
END ;;
DELIMITER ;
