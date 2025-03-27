// src/CRMtemplates/advertisementTemplate.js

export const advertisementTemplate = `
<div>
    <div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt">
        <div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt">
            <div>
                <span class="font" style="font-family: 'trebuchet ms', arial, helvetica, sans-serif">
                    <span class="highlight" style="background-color:#FFFFFF">
                        <span class="colour" style="color:#717275">
                            <span class="font" style="font-family: 'Noto Sans JP', sans-serif">
                                <span class="size" style="font-size: 20px; font-weight: 300;">
                                    [advertisementHeader]
                                </span>
                            </span>
                        </span>
                    </span>
                </span>
            </div>
            <div class="x_827423126align-center" style="text-align: center">
                <a href="[linktoWebsite]"
                   style="display: inline-block; padding: 10px 20px; font-size: 16px; font-weight: bold; color: #FFFFFF; background: linear-gradient(45deg, #40E0D0, #20B2AA); border-radius: 5px; text-align: center; text-decoration: none"
                   target="_blank">[advertisementPitch1] </a>
            </div>
            <div>
                <br>
                <img src="[image1]" alt="Ad Image 1" width="100%">
                  [advertisementDescription1]
                <br>
                <br>
                <img src="[image2]" alt="Ad Image 2" width="100%">
                 [advertisementDescription2]

            </div>

            <div class="x_827423126align-center" style="text-align: center">
          
                   <a href="[linktoWebsite2]" target="_blank" style="color:#009899; font-size:24px;">[advertisementPitch2]
                 <img src="[image3]" alt="Podcast Ad" width="100%">
                </a>
            </div>
        </div>
    </div>
</div>`;
