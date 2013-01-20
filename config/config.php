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

$GLOBALS['TL_HOOKS']['loadDataContainer'][] = array('\MeioMask\MeioMask', 'registerWizard');