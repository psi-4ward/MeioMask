<?php

/**
 * Meio.Mask extension for the Contao WebCMS
 * Extends text-fields with rgxp=date|time|datim with a input-mask to improve the usability
 *
 * Based on http://mootools.net/forge/p/meiomask from Fábio M. Costa
 *
 * @copyright 4ward.media 2013 <http://www.4wardmedia.de>
 * @author Christoph Wiechert <wio@psitrax.de>
 * @licence LGPL
 */


// Register the namespace
ClassLoader::addNamespace('Psi');

// Register the classes
ClassLoader::addClasses(array
(
	'Psi\MeioMask\MeioMask' 	=> 'system/modules/MeioMask/MeioMask.php',
));

// Register the templates
TemplateLoader::addFiles(array
(
//	'mod_' 					=> 'system/modules/MeioMask/templates',
));
