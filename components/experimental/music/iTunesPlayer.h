/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack Music Interface.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Labs
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Anant Narayanan <anant@kix.in>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#ifndef iTunesPlayer_h_
#define iTunesPlayer_h_

#import <Cocoa/Cocoa.h>
#import "iTunes.h"

#include "nsCOMPtr.h"
#include "nsMemory.h"
#include "IMusicPlayer.h"
#include "nsObjCExceptions.h"

#define ITUNES_PLAYER_CONTRACTID "@labs.mozilla.com/music/itunes;1"
#define ITUNES_PLAYER_CLASSNAME  "iTunes Player Control"
#define ITUNES_PLAYER_CID { 0xfa4d55c9, 0x666a, 0x42bd, \
                          { 0xbb, 0xf8, 0x82, 0xa9, 0x9d, 0x31, 0xc6, 0xaf } }
                           

class iTunesPlayer : public IMusicPlayer
{
public:
    NS_DECL_ISUPPORTS
    NS_DECL_IMUSICPLAYER
    
    nsresult Init();
    static iTunesPlayer *GetSingleton();
    virtual ~iTunesPlayer();
    iTunesPlayer(){}

private:
    iTunesApplication *iTunes;
    static iTunesPlayer *iTunesService;
};

#endif
