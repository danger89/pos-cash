class SettingsScreen {
    static createEditDialog(dialogTemplate, label, value, text) {
        const dialogWidget = dialogTemplate.cloneNode(true);

        const dialogTitle = dialogWidget.querySelector(".dialog-label");
        dialogTitle.textContent = label || "";

        const textElement = dialogWidget.querySelector(".text");
        if (textElement) {
            textElement.textContent = text || "";
        }

        const dialogInput = dialogWidget.querySelector(".dialog-input");
        dialogWidget.onComplete = null;

        const confirmButton = dialogWidget.querySelector(".button.confirm");
        if (confirmButton) {
            confirmButton.onclick = function(event) {
                const value = (dialogInput ? dialogInput.value.trim() : null);
                const isAllowed = (dialogWidget.onComplete ? (dialogWidget.onComplete(value) !== false) : true);
                if (isAllowed) {
                    dialogWidget.remove();

                    if (typeof dialogWidget.onClose == "function") {
                        dialogWidget.onClose();
                    }
                }
            };
        }

        const cancelButton = dialogWidget.querySelector(".button.cancel");
        if (cancelButton) {
            cancelButton.onclick = function(event) {
                const isAllowed = (dialogWidget.onCancel ? (dialogWidget.onCancel() !== false) : true);
                if (isAllowed) {
                    dialogWidget.remove();

                    if (typeof dialogWidget.onClose == "function") {
                        dialogWidget.onClose();
                    }
                }
            };
        }

        if (dialogInput) {
            dialogInput.onkeyup = function(event) {
                event = event || window.event;
                const keyCode = event.keyCode;

                if (keyCode == Util.KeyCodes.enter) {
                    if (confirmButton) {
                        confirmButton.click();
                    }
                }
                else if (keyCode == Util.KeyCodes.escape) {
                    if (cancelButton) {
                        cancelButton.click();
                    }
                }
            };
            dialogInput.value = value || "";
            window.setTimeout(function() {
                dialogInput.focus();
            });
            dialogWidget.onclick = function(event) {
                dialogInput.focus();
            };
        }

        return dialogWidget;
    }

    static create() {
        const template = SettingsScreen.template;
        const widget = template.cloneNode(true);

        const closeDialogOnEscape = function(dialogWidget) {
            window.onkeyup = function(event) {
                event = event || window.event;

                const keyCode = event.keyCode;
                if (keyCode == Util.KeyCodes.escape) {
                    clearDialog();
                    window.onkeyup = null;
                }
            };
            dialogWidget.onClose = function() {
                window.onkeyup = null; // Unset the global onkeypress.
            };

        };

        const clearDialog = function() {
            const dialogs = widget.querySelectorAll(".settings-screen-dialog");
            for (let i = 0; i < dialogs.length; i += 1) {
                const dialog = dialogs[i];
                dialog.remove();

                if (typeof dialog.onClose == "function") {
                    dialog.onClose();
                }
            }
        };

        widget.addWidget = function(subWidget) {
            const subWidgetContainer = widget.querySelector(".active-widget");
            subWidgetContainer.appendChild(subWidget);
        };

        // Back Button
        const navigationContainer = widget.querySelector(".navigation-container");
        navigationContainer.onclick = function() {
            clearDialog();

            const checkoutScreen = CheckoutScreen.create();
            App.setScreen(checkoutScreen);
        };

        // Save Button (Helper-butter; all settings saved upon edit)
        const saveButton = widget.querySelector(".save-button");
        saveButton.onclick = function() {
            clearDialog();

            const checkoutScreen = CheckoutScreen.create();
            App.setScreen(checkoutScreen);
        };

        // Merchant Name Setting Widget
        const merchantName = App.getMerchantName();
        const merchantNameSetting = Setting.create("Merchant Name", "/img/merchant.png", merchantName || "...");
        merchantNameSetting.setValue(merchantName);
        merchantNameSetting.onClick = function() {
            const label = merchantNameSetting.getLabel();
            const value = merchantNameSetting.getValue();

            const dialogTemplate = SettingsScreen.editMerchantDialogTemplate;
            const dialogWidget = SettingsScreen.createEditDialog(dialogTemplate, label, value);
            dialogWidget.onComplete = function(value) {
                merchantNameSetting.setValue(value);
                merchantNameSetting.setDisplayValue(value || "...");
                App.setMerchantName(value);
            };

            closeDialogOnEscape(dialogWidget);

            clearDialog();
            widget.appendChild(dialogWidget);
        };
        widget.addWidget(merchantNameSetting);

        const cameraViewport = widget.querySelector(".camera-viewport");

        // Destination Address Setting Widget
        const destinationAddress = App.getDestinationAddress();
        const destinationAddressSetting = Setting.create("Destination Address", "/img/address.png", destinationAddress || "...");
        destinationAddressSetting.setValue(destinationAddress);
        destinationAddressSetting.onClick = function() {
            const label = destinationAddressSetting.getLabel();
            const value = destinationAddressSetting.getValue();

            const dialogTemplate = SettingsScreen.editDestinationAddressDialogTemplate;
            const dialogWidget = SettingsScreen.createEditDialog(dialogTemplate, label, value);
            dialogWidget.onComplete = function(value) {
                const isValid = ( (value.length == 0) || App.isAddressValid(value) );
                if (! isValid) {
                    App.displayToast("Invalid address.", true);
                    return false;
                }

                destinationAddressSetting.setValue(value);
                destinationAddressSetting.setDisplayValue(value || "...");
                App.setDestinationAddress(value);
                return true;
            };

            const scanQrCodeButton = dialogWidget.querySelector(".scan-qr-code-button");
            scanQrCodeButton.onclick = function(event) {
                event = event || window.event;
                event.stopPropagation();

                clearDialog();
                cameraViewport.classList.remove("hidden");
                Util.captureQrCodeFromCamera(cameraViewport, function(qrCode) {
                    cameraViewport.classList.add("hidden");

                    if (qrCode) {
                        const wasValid = dialogWidget.onComplete(qrCode);
                        if (wasValid) {
                            App.displayToast("Address copied.", false);
                        }
                        else {
                            App.displayToast("Invalid address.", true);
                        }
                    }
                });
            };

            closeDialogOnEscape(dialogWidget);

            window.onkeyup = function(event) {
                event = event || window.event;

                const keyCode = event.keyCode;
                if (keyCode == Util.KeyCodes.escape) {
                    clearDialog();
                    window.onkeyup = null;
                }
            };
            dialogWidget.onClose = function() {
                window.onkeyup = null; // Unset the global onkeypress.
            };

            clearDialog();
            widget.appendChild(dialogWidget);
        };
        widget.addWidget(destinationAddressSetting);

        // Local Currency Setting Widget
        const currentCountryIso = App.getCountry();
        const currentCountry = App.getCountryData(currentCountryIso) || App.getCountryData("US");
        const localCurrencySetting = Setting.create("Local Currency", "/img/currency.png", "US USD");
        localCurrencySetting.setValue(currentCountry.iso);
        localCurrencySetting.setDisplayValue(currentCountry.iso + " " + currentCountry.currency);
        localCurrencySetting.onClick = function() {
            const label = localCurrencySetting.getLabel();
            const value = localCurrencySetting.getValue();

            const dialogTemplate = SettingsScreen.editLocalCurrencyDialogTemplate;
            const dialogWidget = SettingsScreen.createEditDialog(dialogTemplate, label, value);

            const currencyListSearch = dialogWidget.querySelector(".currency-list-search");
            currencyListSearch.onkeyup = function(event) {
                event = event || window.event;

                const regex = /[^a-z]/g;
                const value = currencyListSearch.value.toLowerCase().replaceAll(regex, "");
                let selectedItem = null;
                for (let i = 0; i < items.length; i += 1) {
                    const item = items[i];
                    const country = item.country;
                    const countryName = country.name.toLowerCase().replaceAll(regex, "");
                    if (countryName.startsWith(value)) {
                        selectedItem = item;
                        break;
                    }
                }
                if (selectedItem) {
                    selectedItem.scrollIntoView();
                }
            };

            window.setTimeout(function() {
                currencyListSearch.focus();
            });

            const currencyList = dialogWidget.querySelector(".currency-list");
            let selectedItem = null;
            const items = [];
            const countries = App.getCountries();
            for (let i = 0; i < countries.length; i += 1) {
                const country = countries[i];

                const itemTemplate = SettingsScreen.currencyListItemTemplate;
                const item = itemTemplate.cloneNode(true);
                item.country = country;

                const countryIcon = item.querySelector(".country-icon");
                const countryNameLabel = item.querySelector(".country-name");
                const currencyLabel = item.querySelector(".currency-name");

                countryIcon.src = "/img/country/iso_" + country.iso.toLowerCase() + ".png";
                countryNameLabel.textContent = country.name;
                currencyLabel.textContent = country.currency;

                item.onclick = function() {
                    localCurrencySetting.setValue(country.iso);
                    localCurrencySetting.setDisplayValue(country.iso + " " + country.currency);
                    App.setCountry(country.iso);

                    clearDialog();
                };

                if (country.iso == currentCountry.iso) {
                    selectedItem = item;
                }

                clearDialog();
                currencyList.appendChild(item);
                items.push(item);
            }

            clearDialog();
            widget.appendChild(dialogWidget);

            if (selectedItem) {
                window.setTimeout(function() {
                    selectedItem.scrollIntoView();
                });
            }

            closeDialogOnEscape(dialogWidget);
        };
        widget.addWidget(localCurrencySetting);

        // PIN Code Setting Widget
        const pinSetting = Setting.create("PIN Code", "/img/pin.png", "####");
        pinSetting.onClick = function() {
            clearDialog();

            window.onkeyup = function(event) {
                event = event || window.event;

                const keyCode = event.keyCode;
                if (keyCode == Util.KeyCodes.escape) {
                    const settingsScreen = SettingsScreen.create();
                    App.setScreen(settingsScreen);
                    window.onkeyup = null; // Unset the escape handler.
                }
            };

            const pinScreen = PinScreen.create();
            pinScreen.onComplete = function(value) {
                window.onkeyup = null; // Unset the escape handler.

                App.setPin(value);

                const settingsScreen = SettingsScreen.create();
                App.setScreen(settingsScreen);
            };

            App.setScreen(pinScreen);

            window.setTimeout(function() {
                pinScreen.focus();
            });
        };
        widget.addWidget(pinSetting);

        // Reset Settings Widget
        const resetSetting = Setting.create("Reset Data", "/img/trash.png", "Clear all app data.");
        resetSetting.onClick = function() {
            const dialogTemplate = SettingsScreen.editResetDialogTemplate;
            const dialogWidget = SettingsScreen.createEditDialog(dialogTemplate, "Reset Data", null, "Reset/clear all settings.");
            dialogWidget.onComplete = function() {
                window.localStorage.clear();

                const pinScreen = PinScreen.create();
                pinScreen.onComplete = function(value) {
                    window.onkeyup = null; // Unset the escape handler.

                    App.setPin(value);

                    const settingsScreen = SettingsScreen.create();
                    App.setScreen(settingsScreen);
                };
                App.setScreen(pinScreen);

                window.setTimeout(function() {
                    pinScreen.focus();
                });
            };

            closeDialogOnEscape(dialogWidget);

            clearDialog();
            widget.appendChild(dialogWidget);
        };
        widget.addWidget(resetSetting);

        // Map BitcoinDotCom Link
        const mapLink = Setting.create("Advertise", "/img/business.png", "Add your business to map.bitcoin.com.");
        mapLink.onClick = function() {
            window.open("https://map.bitcoin.com/", "_blank").focus();
        };
        widget.addWidget(mapLink);

        App.showAttributions(true);

        widget.unload = function() {
            App.showAttributions(false);
        };

        return widget;
    }
}

App.addOnLoad(function() {
    const templates = document.getElementById("templates");
    SettingsScreen.template = templates.querySelector(".settings-screen");
    SettingsScreen.editMerchantDialogTemplate = templates.querySelector(".settings-screen-dialog.edit-merchant");
    SettingsScreen.editDestinationAddressDialogTemplate = templates.querySelector(".settings-screen-dialog.edit-destination-address");
    SettingsScreen.editLocalCurrencyDialogTemplate = templates.querySelector(".settings-screen-dialog.edit-local-currency");
    SettingsScreen.currencyListItemTemplate = templates.querySelector(".currency-list-item");
    SettingsScreen.editResetDialogTemplate = templates.querySelector(".settings-screen-dialog.reset-data");
});
