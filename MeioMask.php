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
 
namespace Psi\MeioMask;

class MeioMask extends \System
{

	/**
	 * loadDataContainer Callback
	 * Register the Wizard for fields having eval-rgxp set
	 *
	 * @param $strTable
	 * @return void
	 */
	public function registerWizard($strTable)
	{
		if(!is_array($GLOBALS['TL_DCA'][$strTable]['fields'])) return;
		$GLOBALS['TL_JAVASCRIPT']['MeioMask'] = 'system/modules/MeioMask/public/Meio.Mask-uncompressed.js';

		foreach($GLOBALS['TL_DCA'][$strTable]['fields'] as $fld => $data)
		{
			if($data['eval']['rgxp'])
			{
				$GLOBALS['TL_DCA'][$strTable]['fields'][$fld]['wizard'][] = array('\MeioMask\MeioMask','wizardCallback');
			}
		}
	}


	/**
	 * Wizard callback
	 * inject the mask javascript for a field with rgxp=date|time|datim
	 *
	 * @param $dc DataContainer
	 * @return string javascript
	 */
	public function wizardCallback($dc)
	{
		// only for textfields
		if($GLOBALS['TL_DCA'][$dc->table]['fields'][$dc->field]['inputType'] != 'text') return '';

		$rgxp = $GLOBALS['TL_DCA'][$dc->table]['fields'][$dc->field]['eval']['rgxp'];

		switch($rgxp)
		{
			case 'date':
//				$mask = $this->convertDateformatToMeioMask($GLOBALS['TL_CONFIG']['dateFormat']);
//				return ($mask !== 'false') ? '<script>new Meio.Mask.Fixed({mask:"3d.1m.9999"}).link($("ctrl_'.$dc->field.'"));</script>' : '';
//			break;
			case 'time':
//				$mask = $this->convertDateformatToMeioMask($GLOBALS['TL_CONFIG']['timeFormat']);
//				return ($mask !== 'false') ? '<script>new Meio.Mask.Fixed({mask:"2h:59"}).link($("ctrl_'.$dc->field.'"));</script>' : '';
//			break;
			case 'datim':
				$mask = $this->convertDateformatToMeioMask($GLOBALS['TL_CONFIG']['datimFormat']);
				return ($mask !== 'false') ? '<script>new Meio.Mask.Fixed({mask:"'.$mask.'"}).link($("ctrl_'.$dc->field.'"));</script>' : '';
			break;

			case 'mac':
				return '<script>new Meio.Mask.Fixed({mask:"HH:HH:HH:HH:HH:HH"}).link($("ctrl_'.$dc->field.'"));</script>';
			break;
			case 'ip':
				// TODO: Fix this $('ctrl_ip').meiomask('regexp.Ip');
				// return '<script>new Meio.Mask.Regexp({mask:"Ip"}).link($("ctrl_'.$dc->field.'"));</script>';
			break;
		}

		return '';
	}


	/**
	 * Convert php date() format-string to Meio.Mask
	 *
	 * @param string $strFormat date-format string
	 * @return string Meio.Mask.Fixed format string
	 */
	protected function convertDateformatToMeioMask($strFormat)
	{
		if (preg_match('/[BbCcDEeFfIJKkLlMNOoPpQqRrSTtUuVvWwXxZz]+/', $strFormat))
		{
			return false;
		}

		$arrCharacterMapper = array
		(
			'a' => 'am',
			'A' => 'AM',
			'd' => '3d',
			'j' => '3d',
			'm' => '1m',
			'n' => '1m',
			'y' => '99',
			'Y' => '9999',
			'h' => '1m',
			'H' => '2h',
			'g' => '1m',
			'G' => '2h',
			'i' => '59',
			's' => '59',
		);

		$arrInputFormat = array();
		$arrCharacters = str_split($strFormat);

		foreach ($arrCharacters as $strCharacter)
		{
			if (isset($arrCharacterMapper[$strCharacter]))
			{
				$arrInputFormat[$strFormat] .= $arrCharacterMapper[$strCharacter];
				continue;
			}

			$arrInputFormat[$strFormat] .= $strCharacter;
		}

		return $arrInputFormat[$strFormat];
	}


	public function regexMac($rgxp, $varInput, $objWidget)
	{
		if($rgxp != 'mac') return false;

		if(!preg_match('~^([0-9a-fA-F][0-9a-fA-F]:){5}([0-9a-fA-F][0-9a-fA-F])$~', $varInput))
		{
			$objWidget->addError('Please provie a MAC-Address, sperated with colons. Example: f0:de:f1:2a:72:c5', $objWidget->label);
			return true;
		}

		return false;
	}


	public function regexIp($rgxp, $varInput, $objWidget)
	{
		if($rgxp != 'ip') return false;

		if(!preg_match('~^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$~', $varInput))
		{
			$objWidget->addError('Please provie a IP-Address, sperated with colons. Example: 127.0.0.1', $objWidget->label);
			return true;
		}

		return false;
	}
}
